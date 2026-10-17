import { describe, expect, it } from 'vitest';
import { detectPeaks, savitzkyGolay } from '../src/lib/peaks';

const xs = Array.from({ length: 1801 }, (_, i) => 400 + i * 2); // 400–4000 cm⁻¹
const gauss = (x: number, c: number, w: number, d: number) => d * Math.exp(-(((x - c) / w) ** 2));
function synthT(noise = 0, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
  return xs.map((x) => {
    const a = gauss(x, 3350, 150, 0.8) + gauss(x, 2950, 12, 0.6) + gauss(x, 1715, 10, 1.2) + gauss(x, 1050, 15, 0.7);
    return 100 * Math.exp(-a) + noise * rnd();
  });
}

describe('detección de picos', () => {
  it('encuentra los mínimos de transmitancia de un espectro sintético', () => {
    const p = detectPeaks(xs, synthT(), 'transmittance');
    const pos = p.map((q) => q.x);
    for (const c of [3350, 2950, 1715, 1050]) expect(pos.some((x) => Math.abs(x - c) <= 4)).toBe(true);
    expect(p).toHaveLength(4);
  });
  it('clasifica anchura y forma', () => {
    const p = detectPeaks(xs, synthT(), 'transmittance');
    const oh = p.find((q) => Math.abs(q.x - 3350) < 5)!;
    const co = p.find((q) => Math.abs(q.x - 1715) < 5)!;
    expect(oh.shape === 'ancha' || oh.shape === 'muy ancha').toBe(true);
    expect(co.shape === 'aguda' || co.shape === 'media').toBe(true);
    expect(co.intensity).toBe('fuerte');
  });
  it('en absorbancia busca máximos', () => {
    const a = synthT().map((t) => -Math.log10(t / 100));
    const p = detectPeaks(xs, a, 'absorbance');
    expect(p.some((q) => Math.abs(q.x - 1715) <= 4)).toBe(true);
  });
  it('la prominencia mínima y el suavizado filtran el ruido', () => {
    const noisy = synthT(0.8, 7);
    const raw = detectPeaks(xs, noisy, 'transmittance', { minProminence: 0.001 });
    const filt = detectPeaks(xs, noisy, 'transmittance', { minProminence: 0.03, smoothing: 11 });
    expect(raw.length).toBeGreaterThan(20);
    expect(filt.length).toBeLessThanOrEqual(5);
    for (const c of [2950, 1715, 1050]) expect(filt.some((q) => Math.abs(q.x - c) <= 6)).toBe(true);
  });
  it('respeta huecos (NaN) sin inventar picos en ellos', () => {
    const y = synthT();
    for (let i = 600; i < 700; i++) y[i] = NaN;
    const p = detectPeaks(xs, y, 'transmittance');
    expect(p.every((q) => Number.isFinite(q.y))).toBe(true);
  });
  it('Savitzky–Golay conserva la posición de una banda', () => {
    const y = synthT();
    const s = savitzkyGolay(y, 9);
    const iMin = s.indexOf(Math.min(...s));
    expect(Math.abs(xs[iMin] - 1715)).toBeLessThanOrEqual(2);
  });
});
