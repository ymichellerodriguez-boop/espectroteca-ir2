"""OCR por plantillas para la tabla de picos de las impresiones SDBS (fuente de mapa de bits).
Las imágenes se normalizan a la escala nativa (ancho de marco 683 px) antes de segmentar.
"""
import numpy as np
from PIL import Image
from digitize import find_frame

NATIVE_FRAME_W = 683.0


def gray(path):
    return np.asarray(Image.open(path).convert("L")).astype(float)


def normalized(path):
    g = gray(path)
    dark = g < 110
    left, right, top, bottom = find_frame(dark)
    s = (right - left) / NATIVE_FRAME_W
    im = Image.open(path).convert("L")
    if abs(s - 1) > 0.01:
        im = im.resize((int(round(im.width / s)), int(round(im.height / s))), Image.LANCZOS)
    a = np.asarray(im).astype(float)
    return a, s


def table_box(a):
    dark = a < 128
    H, W = dark.shape
    fr = find_frame(dark)
    bottom = fr[3]
    region = dark[bottom + 20:, : W // 2 + 40]
    # columnas verticales largas dentro de la región inferior
    colsum = region.sum(axis=0)
    rows_any = np.where(region.sum(axis=1) > 0)[0]
    if len(rows_any) == 0:
        return None
    vlines = np.where(colsum >= 0.8 * colsum.max())[0]
    if len(vlines) < 2:
        return None
    groups = np.split(vlines, np.where(np.diff(vlines) > 2)[0] + 1)
    xs = [int(g.mean()) for g in groups]
    # filas del rectángulo (línea superior/inferior entre las dos primeras verticales)
    sub = region[:, xs[0]:xs[1]]
    hr = np.where(sub.mean(axis=1) > 0.85)[0]
    if len(hr) < 2:
        return None
    t, b = hr[0], hr[-1]
    # conservar solo las verticales unidas por la línea superior (tabla de picos)
    keep = [xs[0]]
    for x in xs[1:]:
        if region[t, keep[-1]:x + 1].mean() > 0.9:
            keep.append(x)
        else:
            break
    xs = keep
    return xs, bottom + 20 + t, bottom + 20 + b


def segment_cells(a):
    box = table_box(a)
    if box is None:
        return None
    xs, t, b = box
    dark = a < 128
    cells = []
    for i in range(len(xs) - 1):
        x0, x1 = xs[i] + 2, xs[i + 1] - 1
        if x1 - x0 < 20:
            continue
        cells.append(dark[t + 2:b - 1, x0:x1])
    return cells


def lines_of(cell):
    rs = cell.sum(axis=1) > 0
    lines, start = [], None
    for i, v in enumerate(list(rs) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= 4:
                lines.append(cell[start:i])
            start = None
    return lines


def glyphs_of(line):
    cs = line.sum(axis=0) > 0
    out, start = [], None
    for i, v in enumerate(list(cs) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i, line[:, start:i]))
            start = None
    return out


def norm_glyph(g, w=7, h=9):
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
    return (np.asarray(im) > 90).astype(float)


def read_table(path, templates):
    a, s = normalized(path)
    cells = segment_cells(a)
    if cells is None:
        return None, []
    rows, low = [], []
    for cell in cells:
        for line in lines_of(cell):
            gl = glyphs_of(line)
            if not gl:
                continue
            # tokens: separar por huecos mayores que 4 px
            tokens, cur, last_end = [], "", None
            for (x0, x1, g) in gl:
                v = norm_glyph(g)
                best, bd = None, 1e9
                for ch, tpl in templates.items():
                    d = np.abs(v - tpl).sum()
                    if d < bd:
                        best, bd = ch, d
                if bd > 14:
                    low.append((path, best, bd))
                if last_end is not None and x0 - last_end > 4:
                    tokens.append(cur); cur = ""
                cur += best
                last_end = x1
            tokens.append(cur)
            if len(tokens) == 2:
                rows.append((int(tokens[0]), int(tokens[1])))
            else:
                low.append((path, "row:" + "|".join(tokens), -1))
    return rows, low


PITCH = 6


def cells_of_line(line):
    dark = line.astype(float)
    W = dark.shape[1]
    colsum = dark.sum(axis=0)
    best = None
    for o in range(PITCH):
        sc = sum(colsum[x] for x in range(o, W, PITCH))
        if best is None or sc < best[0]:
            best = (sc, o)
    o = best[1]
    out = []
    for k, x in enumerate(range(o, W - 1, PITCH)):
        c = dark[:, x:x + PITCH]
        if c.shape[1] < PITCH:
            c = np.pad(c, ((0, 0), (0, PITCH - c.shape[1])))
        out.append((k, c))
    return out


def cell_vec(c):
    rows = np.where(c.sum(axis=1) > 0)[0]
    if len(rows) == 0:
        return None
    c = c[rows[0]:rows[-1] + 1]
    im = Image.fromarray((c * 255).astype(np.uint8)).resize((PITCH, 7), Image.NEAREST)
    return (np.asarray(im) > 127).astype(float)


def classify(v, templates):
    best, bd = None, 1e9
    for ch, tpls in templates.items():
        for tpl in tpls:
            for dx in (-1, 0, 1):
                d = np.abs(np.roll(v, dx, axis=1) - tpl).sum()
                if d < bd:
                    best, bd = ch, d
    return best, bd


def read_lines(path):
    a, s = normalized(path)
    cells = segment_cells(a)
    if cells is None:
        return None
    out = []
    for ci, cell in enumerate(cells):
        for line in lines_of(cell):
            out.append((ci, cells_of_line(line)))
    return out


def read_table2(path, templates, maxd=6):
    lines = read_lines(path)
    if lines is None:
        return None, ["sin tabla de picos"]
    rows, issues = [], []
    for ci, cl in lines:
        toks, cur, lastk = [], "", None
        for k, c in cl:
            v = cell_vec(c)
            if v is None or v.sum() < 3:
                continue
            ch, d = classify(v, templates)
            if d > maxd:
                issues.append(f"glifo dudoso (d={d:.0f}) en columna {ci}")
            if lastk is not None and k - lastk > 1:
                toks.append(cur); cur = ""
            cur += ch; lastk = k
        if cur:
            toks.append(cur)
        if len(toks) == 2 and all(t.isdigit() for t in toks):
            rows.append((int(toks[0]), int(toks[1])))
        elif toks:
            issues.append("fila no interpretable: " + " ".join(toks))
    return rows, issues


def glyph_canvas(g):
    rows = np.where(g.sum(axis=1) > 0)[0]
    g = g[rows[0]:rows[-1] + 1].astype(float)
    if g.shape[0] != 7:
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((g.shape[1], 7), Image.NEAREST)
        g = (np.asarray(im) > 127).astype(float)
    W = 7
    c = np.zeros((7, W))
    w = min(g.shape[1], W)
    off = (W - w) // 2
    c[:, off:off + w] = g[:, :w]
    return c


def split_glyphs(line):
    out = []
    for x0, x1, g in glyphs_of(line):
        w = x1 - x0
        if w > 6:  # dos glifos unidos
            n = int(round(w / 6.0))
            step = w / n
            for i in range(n):
                a0 = int(round(i * step)); a1 = int(round((i + 1) * step))
                out.append((x0 + a0, x0 + a1, g[:, a0:a1]))
        else:
            out.append((x0, x1, g))
    return out


def classify2(v, templates):
    best, bd = None, 1e9
    for ch, tpls in templates.items():
        for tpl in tpls:
            for dx in (-1, 0, 1):
                d = np.abs(np.roll(v, dx, axis=1) - tpl).sum()
                if d < bd:
                    best, bd = ch, d
    return best, bd


def read_table3(path, templates, maxd=5):
    a, s = normalized(path)
    cells = segment_cells(a)
    if cells is None:
        return None, ["sin tabla de picos"], []
    rows, issues, raw = [], [], []
    for ci, cell in enumerate(cells):
        for line in lines_of(cell):
            toks, cur, last = [], "", None
            worst = 0
            for x0, x1, g in split_glyphs(line):
                if g.sum() < 2:
                    continue
                ch, d = classify2(glyph_canvas(g), templates)
                worst = max(worst, d)
                if last is not None and x0 - last > 4:
                    toks.append(cur); cur = ""
                cur += ch; last = x1
            if cur:
                toks.append(cur)
            raw.append((ci, " ".join(toks), worst))
            if len(toks) == 2:
                rows.append({"wn": int(toks[0]), "T": int(toks[1]), "ocrDist": float(worst)})
            elif toks:
                issues.append("fila no interpretable: " + " ".join(toks))
    return rows, issues, raw


# ---- OCR v4: segmentación en la resolución original y comparación en escala de grises ----
def table_cells_orig(path):
    g = gray(path)
    dark = g < 110
    left, right, top, bottom = find_frame(dark)
    s = (right - left) / NATIVE_FRAME_W
    H, W = dark.shape
    off = int(bottom + 20 * s)
    region = dark[off:, : W // 2 + int(40 * s)]
    colsum = region.sum(axis=0)
    if colsum.max() == 0:
        return None, s
    vl = np.where(colsum >= 0.8 * colsum.max())[0]
    groups = np.split(vl, np.where(np.diff(vl) > 2)[0] + 1)
    xs = [(int(gr[0]), int(gr[-1])) for gr in groups]
    if len(xs) < 2:
        return None, s
    sub = region[:, xs[0][1]:xs[1][0]]
    hr = np.where(sub.mean(axis=1) > 0.85)[0]
    if len(hr) < 2:
        return None, s
    hgroups = np.split(hr, np.where(np.diff(hr) > 2)[0] + 1)
    t, b = hgroups[0][-1], hgroups[-1][0]
    keep = [xs[0]]
    for x in xs[1:]:
        if region[t, keep[-1][1]:x[0]].mean() > 0.9:
            keep.append(x)
        else:
            break
    cells = []
    for i in range(len(keep) - 1):
        x0, x1 = keep[i][1] + 1, keep[i + 1][0]
        cells.append(g[off + t + 1:off + b, x0:x1])
    return cells, s


def ink(gcell, thr=140):
    return gcell < thr


def lines_orig(cell, s):
    d = ink(cell)
    rs = d.sum(axis=1) > 0
    out, st = [], None
    for i, v in enumerate(list(rs) + [False]):
        if v and st is None:
            st = i
        elif not v and st is not None:
            if i - st >= 3 * s:
                out.append(cell[st:i])
            st = None
    return out


def glyphs_orig(line, s):
    d = ink(line)
    cs = d.sum(axis=0) > 0
    segs, st = [], None
    for i, v in enumerate(list(cs) + [False]):
        if v and st is None:
            st = i
        elif not v and st is not None:
            segs.append((st, i)); st = None
    out = []
    pitch = 6 * s
    for a0, a1 in segs:
        w = a1 - a0
        n = max(1, int(round(w / pitch))) if w > 6.5 * s else 1
        step = w / n
        for k in range(n):
            b0 = a0 + int(round(k * step)); b1 = a0 + int(round((k + 1) * step))
            out.append((b0, b1, line[:, b0:b1]))
    return out


def gvec(gl, s):
    # recorte a la altura de la tinta, centrado en lienzo de 7*s x 7*s, reducido a 14x14
    d = ink(gl)
    rows = np.where(d.sum(axis=1) > 0)[0]
    gl = gl[rows[0]:rows[-1] + 1]
    inkv = 255 - gl
    h, w = inkv.shape
    Wc = int(round(7 * s)) + 2
    canvas = np.zeros((h, max(Wc, w)))
    off = (canvas.shape[1] - w) // 2
    canvas[:, off:off + w] = inkv
    im = Image.fromarray(canvas.astype(np.uint8)).resize((14, 14), Image.BILINEAR)
    v = np.asarray(im).astype(float)
    v -= v.mean()
    n = np.linalg.norm(v)
    return v / n if n else v


def build_templates_v4(path, truth):
    cells, s = table_cells_orig(path)
    T = {}
    i = 0
    for cell in cells:
        for line in lines_orig(cell, s):
            gl = [g for g in glyphs_orig(line, s) if ink(g[2]).sum() >= 2]
            txt = truth[i].replace(" ", ""); i += 1
            assert len(gl) == len(txt), (truth[i - 1], len(gl))
            for (x0, x1, g), ch in zip(gl, txt):
                T.setdefault(ch, []).append(gvec(g, s))
    return T


def read_table_v4(path, T):
    cells, s = table_cells_orig(path)
    if not cells:
        return None, ["sin tabla de picos"]
    rows, issues = [], []
    for ci, cell in enumerate(cells):
        for line in lines_orig(cell, s):
            toks, cur, last, worst = [], "", None, 1.0
            for x0, x1, g in glyphs_orig(line, s):
                if ink(g).sum() < 2:
                    continue
                v = gvec(g, s)
                best, bc = None, -2
                for ch, tp in T.items():
                    for t in tp:
                        c = float((v * t).sum())
                        if c > bc:
                            best, bc = ch, c
                worst = min(worst, bc)
                cx = (x0 + x1) / 2.0
                if last is not None and cx - last > 9 * s:
                    toks.append(cur); cur = ""
                cur += best; last = cx
            if cur:
                toks.append(cur)
            if len(toks) == 2:
                rows.append({"wn": int(toks[0]), "T": int(toks[1]), "ocrMinCorr": round(worst, 3), "col": ci})
            elif toks:
                issues.append("fila no interpretable: " + " ".join(toks))
    return rows, issues


def read_table_v5(path, T, amb=0.035):
    """Como v4 pero devuelve, por cada dígito, las lecturas alternativas casi empatadas."""
    cells, s = table_cells_orig(path)
    if not cells:
        return None, ["sin tabla de picos"]
    rows, issues = [], []
    for ci, cell in enumerate(cells):
        for line in lines_orig(cell, s):
            toks, cur, last, worst = [], [], None, 1.0
            for x0, x1, g in glyphs_orig(line, s):
                if ink(g).sum() < 2:
                    continue
                v = gvec(g, s)
                sc = {}
                for ch, tp in T.items():
                    sc[ch] = max(float((v * t).sum()) for t in tp)
                ranked = sorted(sc.items(), key=lambda kv: -kv[1])
                best = ranked[0]
                alts = [ch for ch, c in ranked if best[1] - c <= amb]
                worst = min(worst, best[1])
                cx = (x0 + x1) / 2.0
                if last is not None and cx - last > 9 * s:
                    toks.append(cur); cur = []
                cur.append(alts); last = cx
            if cur:
                toks.append(cur)
            if len(toks) == 2:
                rows.append({"wnDigits": toks[0], "TDigits": toks[1], "ocrMinCorr": round(worst, 3), "col": ci})
            elif toks:
                issues.append("fila no interpretable: " + " ".join("".join(d[0] for d in t) for t in toks))
    return rows, issues
