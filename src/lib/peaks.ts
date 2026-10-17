/**
 * Detección matemática de bandas. Un "pico detectado" NO es una asignación química:
 * es un extremo local con prominencia suficiente. La interpretación se hace después (assign.ts).
 */
import type { SignalKind } from './types';

export interface PeakOptions {
  /** 'auto' = mínimos para transmitancia, máximos para absorbancia */
  mode?: 'auto' | 'min' | 'max';
  /** ventana de suavizado Savitzky–Golay (impar, 0 = sin suavizado) */
  smoothing?: number;
  /** prominencia mínima como fracción del intervalo total de la señal */
  minProminence?: number;
  /** separación mínima entre picos (cm⁻¹) */
  minDistance?: number;
  xMin?: number;
  xMax?: number;
}

export interface DetectedPeak {
  x: number;
  y: number;
  index: number;
  prominence: number;
  prominenceRel: number;
  widthCm: number | null;
  intensity: 'fuerte' | 'media' | 'débil';
  shape: 'aguda' | 'media' | 'ancha' | 'muy ancha' | 'no evaluable';
}

/** Suavizado Savitzky–Golay cuadrático (coeficientes de convolución analíticos). Respeta huecos NaN. */
export function savitzkyGolay(y: number[], window: number): number[] {
  if (!window || window < 5) return y.slice();
  const w = window % 2 === 0 ? window + 1 : window;
  const m = (w - 1) / 2;
  const denom = (2 * m + 3) * (2 * m + 1) * (2 * m - 1);
  const coef: number[] = [];
  for (let i = -m; i <= m; i++) coef.push((3 * (3 * m * m + 3 * m - 1 - 5 * i * i)) / denom);
  const out = y.slice();
  for (let k = m; k < y.length - m; k++) {
    let s = 0;
    let bad = false;
    for (let j = -m; j <= m; j++) {
      const v = y[k + j];
      if (!Number.isFinite(v)) { bad = true; break; }
      s += coef[j + m] * v;
    }
    if (!bad) out[k] = s;
  }
  return out;
}

export function classifyShape(widthCm: number | null): DetectedPeak['shape'] {
  if (widthCm === null || !Number.isFinite(widthCm)) return 'no evaluable';
  if (widthCm >= 250) return 'muy ancha';
  if (widthCm >= 70) return 'ancha';
  if (widthCm <= 20) return 'aguda';
  return 'media';
}

export function detectPeaks(x: number[], yIn: (number | null)[], signal: SignalKind, opts: PeakOptions = {}): DetectedPeak[] {
  const mode = opts.mode && opts.mode !== 'auto' ? opts.mode : signal === 'transmittance' ? 'min' : 'max';
  const y0 = yIn.map((v) => (v === null || v === undefined ? NaN : v));
  const ys = savitzkyGolay(y0, opts.smoothing ?? 0);
  // señal orientada: los picos son máximos de s
  const s = mode === 'min' ? ys.map((v) => -v) : ys;
  const finite = s.filter(Number.isFinite);
  if (finite.length < 5) return [];
  const range = Math.max(...finite) - Math.min(...finite) || 1;
  const minProm = (opts.minProminence ?? 0.03) * range;
  const n = s.length;
  const cands: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (!Number.isFinite(s[i])) continue;
    if (opts.xMin !== undefined && x[i] < opts.xMin) continue;
    if (opts.xMax !== undefined && x[i] > opts.xMax) continue;
    // máximo local con meseta: avanzar mientras sea igual
    let j = i;
    while (j + 1 < n && s[j + 1] === s[i]) j++;
    const left = s[i - 1];
    const right = s[j + 1];
    const okL = !Number.isFinite(left) || left < s[i];
    const okR = j + 1 >= n || !Number.isFinite(right) || right < s[i];
    if (okL && okR && (Number.isFinite(left) || Number.isFinite(right))) cands.push(Math.floor((i + j) / 2));
    i = j;
  }
  const peaks: DetectedPeak[] = [];
  for (const i of cands) {
    const h = s[i];
    // prominencia topográfica: base más alta entre izquierda y derecha
    let lmin = h;
    for (let k = i - 1; k >= 0; k--) {
      if (!Number.isFinite(s[k])) break;
      if (s[k] > h) break;
      if (s[k] < lmin) lmin = s[k];
    }
    let rmin = h;
    for (let k = i + 1; k < n; k++) {
      if (!Number.isFinite(s[k])) break;
      if (s[k] > h) break;
      if (s[k] < rmin) rmin = s[k];
    }
    const prom = h - Math.max(lmin, rmin);
    if (prom < minProm) continue;
    // anchura a media prominencia
    const half = h - prom / 2;
    let xl: number | null = null;
    for (let k = i; k > 0; k--) {
      if (!Number.isFinite(s[k - 1])) break;
      if (s[k - 1] < half) { xl = x[k - 1] + ((half - s[k - 1]) / (s[k] - s[k - 1])) * (x[k] - x[k - 1]); break; }
    }
    let xr: number | null = null;
    for (let k = i; k < n - 1; k++) {
      if (!Number.isFinite(s[k + 1])) break;
      if (s[k + 1] < half) { xr = x[k] + ((s[k] - half) / (s[k] - s[k + 1])) * (x[k + 1] - x[k]); break; }
    }
    const widthCm = xl !== null && xr !== null ? Math.abs(xr - xl) : null;
    peaks.push({ x: x[i], y: y0[i], index: i, prominence: prom, prominenceRel: prom / range, widthCm, intensity: 'débil', shape: classifyShape(widthCm) });
  }
  // separación mínima: conservar el de mayor prominencia
  const minD = opts.minDistance ?? 8;
  peaks.sort((a, b) => b.prominence - a.prominence);
  const kept: DetectedPeak[] = [];
  for (const p of peaks) if (!kept.some((k) => Math.abs(k.x - p.x) < minD)) kept.push(p);
  const maxProm = kept.length ? kept[0].prominence : 1;
  for (const p of kept) {
    const r = p.prominence / maxProm;
    p.intensity = r >= 0.5 ? 'fuerte' : r >= 0.2 ? 'media' : 'débil';
  }
  return kept.sort((a, b) => b.x - a.x);
}
