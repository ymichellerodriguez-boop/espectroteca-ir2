"""Canalización de extracción del Word: digitalización + OCR de tabla de picos + validación cruzada."""
import json, itertools, os
import numpy as np
from digitize import digitize
from peakocr import read_table_v5

HERE = os.path.dirname(os.path.abspath(__file__))
T = {k: [np.array(t) for t in v] for k, v in json.load(open(os.path.join(HERE, 'glyph-templates.json'))).items()}
# dígitos que la fuente de mapa de bits reescalada confunde con frecuencia
CONF = {'0': '689', '1': '7', '2': '7', '3': '8952', '4': '1', '5': '6839', '6': '5809', '7': '12', '8': '6390', '9': '830'}


def curve_arrays(pts):
    x = np.array([p[0] for p in pts], float)
    y = np.array([np.nan if p[1] is None else p[1] for p in pts], float)
    return x, y


def tol_cm(wn):
    # 2.5 px expresados en cm-1 (resolución nativa del eje a tramos)
    return 2.5 * (5200 / 683.0) * (1.0 if wn >= 2000 else 0.5)


def check_peak(x, y, wn, t):
    tol = tol_cm(wn)
    m = (x >= wn - tol) & (x <= wn + tol) & ~np.isnan(y)
    if m.sum() == 0:
        return None  # hueco en la curva (p. ej. banda del disolvente recortada)
    ymin = np.nanmin(y[m])
    xm = x[m][np.nanargmin(y[m])]
    return {'curveMinT': round(float(ymin), 1), 'curveMinWn': round(float(xm), 1), 'dT': round(float(ymin - t), 1)}


def variants(s):
    out = set()
    for i, ch in enumerate(s):
        for alt in CONF.get(ch, ''):
            out.add(s[:i] + alt + s[i + 1:])
    return out


def local_minima(x, y):
    idx = []
    n = len(y)
    for i in range(n):
        if np.isnan(y[i]):
            continue
        lo = max(0, i - 3); hi = min(n, i + 4)
        w = y[lo:hi]
        if np.all(np.isnan(w) | (w >= y[i])):
            idx.append(i)
    return idx


def assess(x, y, mins, wn, t):
    tol = tol_cm(wn)
    best = None
    for i in mins:
        if abs(x[i] - wn) <= tol and abs(y[i] - t) <= 5:
            d = abs(x[i] - wn) / tol + abs(y[i] - t) / 5
            if best is None or d < best[0]:
                best = (d, float(x[i]), float(y[i]))
    if best:
        return 'verificado', {'curveWn': round(best[1], 1), 'curveT': round(best[2], 1), 'score': round(best[0], 3)}
    m = (x >= wn - tol) & (x <= wn + tol) & ~np.isnan(y)
    if m.sum() == 0:
        return 'sin-curva', None
    if np.any(np.abs(y[m] - t) <= 4):
        return 'coherente', None
    return 'dudoso', {'curveMinT': round(float(np.nanmin(y[m])), 1)}


RANK = {'verificado': 0, 'coherente': 1, 'sin-curva': 2, 'dudoso': 3}


def process(path):
    dg = digitize(path)
    x, y = curve_arrays(dg['points'])
    mins = local_minima(x, y)
    rows, issues = read_table_v5(path, T)
    peaks = []
    for r in rows or []:
        wc = [''.join(p) for p in itertools.product(*r['wnDigits'])][:64]
        tc = [''.join(p) for p in itertools.product(*r['TDigits'])][:16]
        primary = (''.join(d[0] for d in r['wnDigits']), ''.join(d[0] for d in r['TDigits']))
        cands = []
        for w in wc:
            for tt in tc:
                wi, ti = int(w), int(tt)
                if not (350 <= wi <= 4000 and 0 <= ti <= 100):
                    continue
                st, info = assess(x, y, mins, wi, ti)
                sc = info['score'] if (info and 'score' in info) else 9
                cands.append((RANK[st], sc, (w, tt) != primary, wi, ti, st, info))
        if not cands:
            issues.append('valor fuera de rango: %s %s' % primary)
            continue
        cands.sort(key=lambda c: (c[0], c[1], c[2]))
        b = cands[0]
        ambiguous = len(wc) > 1 or len(tc) > 1
        peaks.append({'wn': b[3], 'T': b[4], 'status': b[5], 'check': b[6], 'ocrMinCorr': r['ocrMinCorr'],
                      'ocrPrimary': [int(primary[0]), int(primary[1])], 'ambiguous': ambiguous,
                      'alternatives': sorted(set(f"{c[3]} {c[4]}" for c in cands))[:8] if ambiguous else []})
    # segunda pasada: la tabla de SDBS está ordenada de mayor a menor número de onda
    for k, p in enumerate(peaks):
        prev = peaks[k - 1]['wn'] if k > 0 else 99999
        nxt = peaks[k + 1]['wn'] if k + 1 < len(peaks) else -1
        if prev > p['wn'] > nxt:
            continue
        best = None
        pool = set(p['alternatives'])
        for w2 in variants(str(p['wn'])):
            pool.add(f"{w2} {p['T']}")
            for t2 in variants(str(p['T'])):
                pool.add(f"{w2} {t2}")
        for alt in pool:
            w, t = map(int, alt.split())
            if not (350 <= w <= 4000 and 0 <= t <= 100):
                continue
            if prev > w > nxt:
                st, info = assess(x, y, mins, w, t)
                key = (RANK[st], info['score'] if info and 'score' in info else 9)
                if best is None or key < best[0]:
                    best = (key, w, t, st, info)
        if best and best[0][0] == 0:
            p.update({'wn': best[1], 'T': best[2], 'status': best[3], 'check': best[4], 'orderFixed': True, 'ambiguous': True,
                      'alternatives': sorted(set(p['alternatives']) | {f"{p['ocrPrimary'][0]} {p['ocrPrimary'][1]}"})})
    order_breaks = sum(1 for a, b in zip(peaks, peaks[1:]) if b['wn'] > a['wn'])
    for k in range(1, len(peaks)):
        if peaks[k]['wn'] > peaks[k - 1]['wn']:
            peaks[k]['orderWarning'] = True
    return dg, peaks, issues, order_breaks
