"""Digitalizador de impresiones IR de SDBS (procedimiento documentado y verificable).

Supuestos verificados en cada imagen (si fallan, la imagen se marca para revisión):
  * El marco del gráfico es el rectángulo más alto delimitado por dos líneas verticales.
  * Eje X: 4000 cm-1 en el borde izquierdo, 400 cm-1 en el derecho, con cambio de
    escala en 2000 cm-1 (la región 2000-400 tiene el doble de px por cm-1).
    Se verifica buscando las marcas del eje en 3000, 2000, 1500, 1000 y 500 cm-1.
  * Eje Y: borde superior = 100 %T, borde inferior = 0 %T.
Salida: lista de puntos (cm-1, %T); columnas sin trazo -> hueco (None).
"""
import json, sys
import numpy as np
from PIL import Image

XTICKS = [3000, 2000, 1500, 1000, 500]


def wn_to_frac(wn):
    # fracción horizontal (0 izq, 1 der) para el eje SDBS a tramos
    k = 1.0 / 5200.0
    if wn >= 2000:
        return (4000 - wn) * k
    return 2000 * k + (2000 - wn) * 2 * k


def frac_to_wn(f):
    k = 1.0 / 5200.0
    if f <= 2000 * k:
        return 4000 - f / k
    return 2000 - (f - 2000 * k) / (2 * k)


def load_mask(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(int)
    # trazo negro: oscuro y no gris del borde de Word (gris claro ~ 200)
    dark = (a.max(axis=2) < 110)
    return dark, im.size


def find_frame(dark):
    H, W = dark.shape
    colsum = dark[int(H * 0.25):int(H * 0.70), :].sum(axis=0)
    band = int(H * 0.70) - int(H * 0.25)
    vcols = np.where(colsum > band * 0.9)[0]
    if len(vcols) < 2:
        raise ValueError("no se detectaron bordes verticales del marco")
    # agrupar columnas contiguas
    groups = np.split(vcols, np.where(np.diff(vcols) > 2)[0] + 1)
    left, right = groups[0][-1], groups[-1][0]
    if right - left < W * 0.6:
        raise ValueError("marco demasiado estrecho")
    span = dark[:, left + 5:right - 5]
    rowfrac = span.mean(axis=1)
    hrows = np.where(rowfrac > 0.9)[0]
    rgroups = np.split(hrows, np.where(np.diff(hrows) > 2)[0] + 1)
    # par de líneas consecutivas con mayor separación = marco del gráfico
    best = None
    for i in range(len(rgroups) - 1):
        t, b = rgroups[i][-1], rgroups[i + 1][0]
        # las verticales deben cubrir ese intervalo
        if dark[t + 2:b - 2, left].mean() > 0.9 and (best is None or b - t > best[1] - best[0]):
            best = (t, b)
    if best is None:
        raise ValueError("no se detectó el marco horizontal")
    return int(left), int(right), int(best[0]), int(best[1])


def check_ticks(dark, left, right, bottom):
    W = right - left
    found = []
    for wn in XTICKS:
        x = left + wn_to_frac(wn) * W
        xs = range(int(round(x)) - 3, int(round(x)) + 4)
        below = dark[bottom + 2:bottom + 9, :]
        hit = any(below[:, c].sum() >= 3 for c in xs if 0 <= c < dark.shape[1])
        found.append(bool(hit))
    return found


def digitize(path):
    dark, (W0, H0) = load_mask(path)
    left, right, top, bottom = find_frame(dark)
    ticks = check_ticks(dark, left, right, bottom)
    W = right - left
    H = bottom - top
    inner = dark[top + 2:bottom - 1, left + 2:right - 1]
    pts = []
    prev = None
    for ci in range(inner.shape[1]):
        col = np.where(inner[:, ci])[0]
        xpix = left + 2 + ci
        wn = frac_to_wn((xpix - left) / W)
        if len(col) == 0:
            pts.append((round(wn, 1), None)); prev = None; continue
        # tomar el tramo conexo más cercano al punto previo
        runs = np.split(col, np.where(np.diff(col) > 1)[0] + 1)
        if prev is not None:
            run = min(runs, key=lambda r: min(abs(r[0] - prev), abs(r[-1] - prev)))
        else:
            run = max(runs, key=len)
        t_top = 100 * (1 - (run[0] + 2) / H)
        t_bot = 100 * (1 - (run[-1] + 2) / H)
        if len(run) <= 3:
            y = (t_top + t_bot) / 2
            pts.append((round(wn, 1), round(y, 2))); prev = (run[0] + run[-1]) / 2
        else:
            # tramo vertical: se conservan ambos extremos ordenados por continuidad
            dwn = (frac_to_wn((xpix + 0.5 - left) / W) - wn)
            first, second = (t_top, t_bot)
            if prev is not None and abs(run[-1] - prev) < abs(run[0] - prev):
                first, second = t_bot, t_top
                prev = run[0]
            else:
                prev = run[-1]
            pts.append((round(wn, 1), round(first, 2)))
            pts.append((round(wn + dwn, 1), round(second, 2)))
    return {
        "frame": {"left": left, "right": right, "top": top, "bottom": bottom, "imageW": W0, "imageH": H0},
        "tickCheck": dict(zip([str(t) for t in XTICKS], ticks)),
        "points": pts,
    }


if __name__ == "__main__":
    r = digitize(sys.argv[1])
    print(json.dumps({k: v for k, v in r.items() if k != "points"}), len(r["points"]))
