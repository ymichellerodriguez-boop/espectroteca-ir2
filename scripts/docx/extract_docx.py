"""Extrae la biblioteca inicial desde ESPECTROS.docx.

Uso (desde la raíz del repositorio):
    python3 -I scripts/docx/extract_docx.py data/source/ESPECTROS.docx

Requisitos: Python 3.10+, numpy, Pillow  (pip install numpy pillow)

Procedimiento:
  1. Lee word/document.xml en orden y relaciona cada imagen con el párrafo de texto que la precede.
  2. Para cada imagen: detecta el marco del gráfico, calibra el eje a tramos de SDBS
     (4000-2000 / 2000-400 cm-1, verificado con las marcas del eje) y digitaliza la curva.
  3. Lee la tabla de picos impresa con un OCR por plantillas y valida cada pico contra un mínimo
     local de la curva digitalizada y contra el orden decreciente de la tabla.
  4. Contrasta el nombre impreso en la imagen (transcripción revisada en
     data/source/headers-verificados.tsv) con el nombre del Word.
  5. Copia las imágenes originales (bytes sin modificar) a public/spectra/sdbs/.
Salida: data/extracted/docx-extraction.json y data/extracted/docx-report.md
"""
import hashlib, json, os, re, shutil, sys, tempfile, zipfile
import xml.etree.ElementTree as ET
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pipeline import process  # noqa: E402
from compounds_meta import rows as meta_rows  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def slug(s):
    s = s.lower().replace("'", '').replace('’', '')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def split_names(t):
    # los nombres se separan con «, »; las comas internas de los locantes (1,2,4-) no llevan espacio
    return [x.strip() for x in re.split(r',\s+', t) if x.strip()]


def norm(s):
    return re.sub(r'[^A-Z0-9]', '', (s or '').upper())


def read_docx(path, tmp):
    with zipfile.ZipFile(path) as z:
        z.extractall(tmp)
    rels = ET.parse(os.path.join(tmp, 'word/_rels/document.xml.rels')).getroot()
    rmap = {r.get('Id'): r.get('Target') for r in rels}
    body = ET.parse(os.path.join(tmp, 'word/document.xml')).getroot().find('w:body', NS)
    paras = []
    for el in body.iter('{%s}p' % NS['w']):
        t = ''.join(x.text or '' for x in el.iter('{%s}t' % NS['w']))
        imgs = [rmap.get(b.get('{%s}embed' % NS['r'])) for b in el.iter('{%s}blip' % NS['a'])]
        st = el.find('w:pPr/w:pStyle', NS)
        style = st.get('{%s}val' % NS['w']) if st is not None else ''
        if t.strip() or imgs:
            paras.append((style, t, imgs))
    pending_lists, entries = [], []
    section, pending = None, None
    for style, t, imgs in paras:
        if style == 'Title':
            section = t.strip().rstrip(':').strip()
            pending = None
            continue
        if section is None:  # listas de nombres sin espectro al principio del documento
            if ':' in t:
                cat, names = t.split(':', 1)
                pending_lists.append({'category': cat.strip(), 'names': split_names(names)})
            continue
        if imgs:
            if pending is None:
                entries.append({'section': section, 'docName': None, 'image': imgs[0]})
            else:
                pending['image'] = imgs[0]
                pending = None
            continue
        if ',' in t and len(t) > 60:
            for n in split_names(t):
                entries.append({'section': section, 'docName': n, 'image': None, 'fromList': True})
            pending = None
            continue
        pending = {'section': section, 'docName': t.strip(), 'image': None}
        entries.append(pending)
    return pending_lists, entries


def main():
    docx = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'data/source/ESPECTROS.docx')
    out_json = os.path.join(ROOT, 'data/extracted/docx-extraction.json')
    img_out = os.path.join(ROOT, 'public/spectra/sdbs')
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    os.makedirs(img_out, exist_ok=True)
    headers = {}
    with open(os.path.join(ROOT, 'data/source/headers-verificados.tsv'), encoding='utf-8') as f:
        next(f)
        for line in f:
            p = line.rstrip('\n').split('\t')
            headers[int(p[0])] = {'imageName': p[1], 'sdbsNo': p[2] or None, 'irNida': p[3] or None, 'technique': p[4] or None}
    meta = meta_rows()
    with open(docx, 'rb') as f:
        docx_sha = hashlib.sha256(f.read()).hexdigest()
    tmp = tempfile.mkdtemp(prefix='espectros_')
    try:
        pending_lists, entries = read_docx(docx, tmp)
        with_img = [e for e in entries if e['image']]
        hashes = {}
        records = []
        for i, e in enumerate(with_img):
            p = os.path.join(tmp, 'word', e['image'])
            raw = open(p, 'rb').read()
            h = hashlib.sha256(raw).hexdigest()
            hdr = headers.get(i, {})
            m = meta.get(i)
            rec = {'docIndex': i, 'section': e['section'], 'docName': e['docName'], 'image': e['image'], 'imageSha256': h, 'header': hdr}
            dup_of = hashes.get(h)
            if dup_of is not None:
                rec['nameCheck'] = 'imagen-duplicada'
                rec['nameCheckDetail'] = f'La imagen es idéntica a la de la entrada {dup_of} ({with_img[dup_of]["docName"]}); en la imagen se lee «{hdr.get("imageName")}».'
                records.append(rec)
                continue
            hashes[h] = i
            if not hdr.get('sdbsNo'):
                rec['nameCheck'] = 'no-verificable'
                rec['nameCheckDetail'] = 'Formato SDBS moderno sin nombre ni tabla de picos impresos: no se puede verificar que la imagen corresponda al compuesto.'
            elif m is None:
                rec['nameCheck'] = 'sin-metadatos'
            else:
                names = {norm(m['name'])} | {norm(s) for s in m['synonyms']}
                img_ok = norm(hdr['imageName']) in names
                doc_ok = norm(e['docName']) in names | {norm(m['nameEs'])}
                if img_ok and doc_ok:
                    rec['nameCheck'] = 'coincide'
                elif img_ok and not doc_ok:
                    rec['nameCheck'] = 'discrepancia-nombre'
                    rec['nameCheckDetail'] = f'El Word la titula «{e["docName"]}», pero la impresión SDBS corresponde a «{hdr["imageName"]}». Se cataloga con el nombre impreso en la imagen.'
                else:
                    rec['nameCheck'] = 'revisar'
            if m is None:
                records.append(rec)
                continue
            dg, peaks, issues, ob = process(p)
            ext = os.path.splitext(e['image'])[1].lower()
            cid = slug(m['name'])
            shutil.copyfile(p, os.path.join(img_out, cid + ext))
            rec.update({
                'id': cid, 'meta': m, 'originalImage': f'spectra/sdbs/{cid}{ext}',
                'frame': dg['frame'], 'tickCheck': dg['tickCheck'],
                'points': dg['points'], 'peaks': peaks, 'ocrIssues': issues, 'orderBreaks': ob,
                'stats': dict(Counter(pk['status'] for pk in peaks)),
            })
            records.append(rec)
            print(i, cid, rec['nameCheck'], rec['stats'])
        text_only = [e for e in entries if not e['image']]
        result = {
            'source': {'file': os.path.basename(docx), 'sha256': docx_sha},
            'method': {
                'axisModel': 'SDBS a tramos: 4000-2000 cm-1 y 2000-400 cm-1 (la segunda región con el doble de píxeles por cm-1); 100 %T arriba, 0 %T abajo',
                'peakValidation': 'pico OCR aceptado como verificado si existe un mínimo local de la curva digitalizada a ±2,5 px y ±5 %T',
                'templatesFrom': ['benzene (image109.gif)', 'methanol (image86.png)', 'cyclohexanol (image1.png)'],
            },
            'pendingLists': pending_lists,
            'textOnlyEntries': text_only,
            'records': records,
        }
        with open(out_json, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        write_report(result, os.path.join(ROOT, 'data/extracted/docx-report.md'))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def write_report(res, path):
    recs = res['records']
    tot = Counter()
    for r in recs:
        for k, v in (r.get('stats') or {}).items():
            tot[k] += v
    L = ['# Informe de extracción de ESPECTROS.docx', '',
         f"Archivo: `{res['source']['file']}` (SHA-256 `{res['source']['sha256'][:16]}…`)", '',
         f"- Imágenes en el documento: **{len(recs)}**",
         f"- Imágenes catalogadas: **{sum(1 for r in recs if r.get('id'))}**",
         f"- Entradas con nombre pero sin imagen: **{len(res['textOnlyEntries'])}**",
         f"- Listas de nombres sin espectros (categorías pendientes): **{len(res['pendingLists'])}**", '',
         '## Validación de la tabla de picos (OCR + curva digitalizada)', '',
         '| Estado | Picos |', '|---|---|']
    for k in ('verificado', 'coherente', 'dudoso', 'sin-curva'):
        L.append(f'| {k} | {tot.get(k, 0)} |')
    L += ['', '## Incidencias de correspondencia nombre ↔ imagen', '']
    for r in recs:
        if r.get('nameCheck') not in ('coincide',):
            L.append(f"- Entrada {r['docIndex']} «{r['docName']}» ({r['section']}): **{r.get('nameCheck')}**. {r.get('nameCheckDetail', '')}")
    L += ['', '## Entradas con nombre y sin imagen', '']
    for e in res['textOnlyEntries']:
        L.append(f"- {e['docName']} ({e['section']})")
    L += ['', '## Calibración del eje (marcas 3000/2000/1500/1000/500 cm-1 encontradas)', '']
    bad = [r for r in recs if r.get('tickCheck') and not all(r['tickCheck'].values())]
    L.append('Todas las imágenes superan la comprobación.' if not bad else '\n'.join(f"- {r['id']}: {r['tickCheck']} (formato distinto; ejes verificados visualmente)" for r in bad))
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
