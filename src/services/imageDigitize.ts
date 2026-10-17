/**
 * Digitalización de espectros a partir de imágenes, en el navegador.
 * Es una estimación: la resolución depende de los píxeles y de la calibración que haga el usuario.
 * Nunca se presenta como dato experimental exacto.
 */

export interface Calibration {
  /** puntos de calibración del eje X: píxel → número de onda (2 o 3 puntos; 3 = escala a tramos) */
  xPoints: { px: number; value: number }[];
  /** dos puntos del eje Y: píxel → valor de la señal */
  yPoints: { py: number; value: number }[];
  /** recuadro de búsqueda del trazo (píxeles) */
  roi: { x0: number; x1: number; y0: number; y1: number };
}

export interface DigitizeOptions {
  /** luminancia máxima (0–255) para considerar un píxel parte del trazo */
  threshold: number;
  /** color del trazo (si se indica, se usa la distancia de color en lugar de la luminancia) */
  traceColor?: [number, number, number];
  colorTolerance?: number;
}

export function imageDataFrom(img: CanvasImageSource, w: number, h: number): ImageData {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export function darkMask(im: ImageData, o: DigitizeOptions): Uint8Array {
  const { data, width, height } = im;
  const m = new Uint8Array(width * height);
  const tc = o.traceColor;
  const tol = (o.colorTolerance ?? 80) ** 2;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    if (tc) {
      const d = (r - tc[0]) ** 2 + (g - tc[1]) ** 2 + (b - tc[2]) ** 2;
      m[i] = d <= tol ? 1 : 0;
    } else {
      m[i] = Math.max(r, g, b) < o.threshold ? 1 : 0;
    }
  }
  return m;
}

/** Píxel X → número de onda (lineal por tramos entre los puntos de calibración). */
export function pxToX(px: number, pts: { px: number; value: number }[]): number {
  const p = [...pts].sort((a, b) => a.px - b.px);
  let i = 0;
  while (i < p.length - 2 && px > p[i + 1].px) i++;
  const a = p[i];
  const b = p[i + 1];
  return a.value + ((px - a.px) / (b.px - a.px)) * (b.value - a.value);
}
export function pyToY(py: number, pts: { py: number; value: number }[]): number {
  const [a, b] = pts;
  return a.value + ((py - a.py) / (b.py - a.py)) * (b.value - a.value);
}

/**
 * Recorre cada columna del recuadro y toma el tramo de píxeles del trazo más cercano al anterior.
 * Las columnas casi completamente oscuras (líneas verticales de la cuadrícula) se descartan.
 */
export function traceCurve(mask: Uint8Array, width: number, cal: Calibration, prefer: 'bottom' | 'top' | 'center' = 'bottom'): { x: number[]; y: number[]; columns: number; empty: number } {
  const { x0, x1, y0, y1 } = cal.roi;
  const xs: number[] = [];
  const ys: number[] = [];
  let prev: number | null = null;
  let empty = 0;
  const hgt = y1 - y0;
  for (let cx = Math.ceil(x0); cx <= Math.floor(x1); cx++) {
    const col: number[] = [];
    for (let cy = Math.ceil(y0); cy <= Math.floor(y1); cy++) if (mask[cy * width + cx]) col.push(cy);
    if (!col.length || col.length > hgt * 0.85) {
      empty++;
      xs.push(pxToX(cx, cal.xPoints));
      ys.push(NaN);
      prev = null;
      continue;
    }
    const runs: number[][] = [];
    let cur = [col[0]];
    for (let k = 1; k < col.length; k++) {
      if (col[k] - col[k - 1] <= 1) cur.push(col[k]);
      else {
        runs.push(cur);
        cur = [col[k]];
      }
    }
    runs.push(cur);
    const run: number[] = prev === null ? runs.reduce((a, b) => (b.length > a.length ? b : a)) : runs.reduce((a, b) => (Math.min(Math.abs(b[0] - prev!), Math.abs(b[b.length - 1] - prev!)) < Math.min(Math.abs(a[0] - prev!), Math.abs(a[a.length - 1] - prev!)) ? b : a));
    const mid: number = (run[0] + run[run.length - 1]) / 2;
    xs.push(pxToX(cx, cal.xPoints));
    // en tramos verticales largos se conserva el extremo del lado de las bandas:
    // abajo para transmitancia (las bandas son descensos), arriba para absorbancia
    const yPix = run.length > 3 && prefer !== 'center' ? (prefer === 'bottom' ? run[run.length - 1] : run[0]) : mid;
    ys.push(pyToY(yPix, cal.yPoints));
    prev = mid;
  }
  // ordenar por número de onda creciente
  const idx = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
  const X: number[] = [];
  const Y: number[] = [];
  for (const i of idx) {
    if (X.length && xs[i] <= X[X.length - 1]) continue;
    X.push(xs[i]);
    Y.push(ys[i]);
  }
  return { x: X, y: Y, columns: xs.length, empty };
}

/**
 * Detección automática del marco de una impresión de SDBS (mismo método que scripts/docx/digitize.py):
 * el rectángulo más alto delimitado por dos líneas verticales; eje 4000→400 cm⁻¹ con cambio de escala
 * en 2000 cm⁻¹ y 100 %T arriba, 0 %T abajo. Devuelve null si no encuentra el marco.
 */
export function detectSdbsFrame(im: ImageData): Calibration | null {
  const { width: W, height: H } = im;
  const dark = darkMask(im, { threshold: 110 });
  const r0 = Math.floor(H * 0.25);
  const r1 = Math.floor(H * 0.7);
  const colsum = new Array(W).fill(0);
  for (let x = 0; x < W; x++) for (let y = r0; y < r1; y++) colsum[x] += dark[y * W + x];
  const band = r1 - r0;
  const vcols = colsum.map((v, i) => (v > band * 0.9 ? i : -1)).filter((i) => i >= 0);
  if (vcols.length < 2) return null;
  const left = vcols.find((c, k) => vcols[k + 1] === undefined || vcols[k + 1] - c > 2)!;
  const right = [...vcols].reverse().find((c, k, arr) => arr[k + 1] === undefined || c - arr[k + 1] > 2)!;
  if (right - left < W * 0.6) return null;
  const rowFrac: number[] = [];
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let x = left + 5; x < right - 5; x++) s += dark[y * W + x];
    rowFrac.push(s / (right - left - 10));
  }
  const hrows = rowFrac.map((v, i) => (v > 0.9 ? i : -1)).filter((i) => i >= 0);
  const groups: number[][] = [];
  for (const r of hrows) {
    const g = groups[groups.length - 1];
    if (g && r - g[g.length - 1] <= 2) g.push(r);
    else groups.push([r]);
  }
  let best: [number, number] | null = null;
  for (let i = 0; i < groups.length - 1; i++) {
    const t = groups[i][groups[i].length - 1];
    const b = groups[i + 1][0];
    let cov = 0;
    for (let y = t + 2; y < b - 2; y++) cov += dark[y * W + left];
    if (cov / Math.max(1, b - t - 4) > 0.9 && (!best || b - t > best[1] - best[0])) best = [t, b];
  }
  if (!best) return null;
  const [top, bottom] = best;
  const w = right - left;
  const f2000 = 2000 / 5200;
  return {
    xPoints: [
      { px: left, value: 4000 },
      { px: left + f2000 * w, value: 2000 },
      { px: right, value: 400 },
    ],
    yPoints: [
      { py: top, value: 100 },
      { py: bottom, value: 0 },
    ],
    roi: { x0: left + 2, x1: right - 2, y0: top + 2, y1: bottom - 2 },
  };
}
