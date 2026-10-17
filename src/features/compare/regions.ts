import { detectPeaks } from '../../lib/peaks';
import type { SignalKind } from '../../lib/types';

export const COMPARE_REGIONS = [
  { id: 'xh', label: 'O–H / N–H', hi: 3650, lo: 3100, meaning: 'alcoholes, fenoles, ácidos, aminas y amidas' },
  { id: 'sp2', label: 'C–H sp²', hi: 3100, lo: 3000, meaning: 'anillos aromáticos y alquenos' },
  { id: 'sp3', label: 'C–H sp³', hi: 3000, lo: 2840, meaning: 'cadenas alquílicas' },
  { id: 'triple', label: 'C≡N / C≡C', hi: 2270, lo: 2100, meaning: 'nitrilos y alquinos' },
  { id: 'co', label: 'C=O', hi: 1830, lo: 1650, meaning: 'carbonilos (posición según el tipo)' },
  { id: 'ring', label: 'C=C / anillo', hi: 1650, lo: 1450, meaning: 'alquenos, anillos, flexiones N–H' },
  { id: 'co1', label: 'C–O', hi: 1300, lo: 1000, meaning: 'alcoholes, éteres y ésteres (huella dactilar)' },
  { id: 'oop', label: 'C–H fuera del plano', hi: 900, lo: 675, meaning: 'patrón de sustitución aromática y alquénica' },
] as const;

export interface RegionHit {
  wn: number;
  rel: number; // prominencia relativa 0–1
  broad?: boolean;
}

/** Banda más prominente de cada región (prominencia ≥ 6 % del intervalo de la señal). */
export function regionHits(x: number[], y: (number | null)[], signal: SignalKind): Record<string, RegionHit | null> {
  const peaks = detectPeaks(x, y, signal, { minProminence: 0.06, minDistance: 10 });
  const out: Record<string, RegionHit | null> = {};
  // absorción ancha: comparar la mediana de la región con la línea base (percentil 95 de la señal orientada)
  const s = y.map((v) => (v === null || !Number.isFinite(v) ? NaN : signal === 'transmittance' ? v : -v));
  const fin = s.filter(Number.isFinite).sort((a, b) => a - b);
  const base = fin[Math.floor(fin.length * 0.95)];
  const range = (fin[fin.length - 1] - fin[0]) || 1;
  for (const r of COMPARE_REGIONS) {
    const inR = peaks.filter((p) => p.x <= r.hi && p.x >= r.lo).sort((a, b) => b.prominence - a.prominence);
    if (inR.length) {
      out[r.id] = { wn: Math.round(inR[0].x), rel: inR[0].prominenceRel };
      continue;
    }
    const vals: { x: number; v: number }[] = [];
    x.forEach((xv, i) => xv <= r.hi && xv >= r.lo && Number.isFinite(s[i]) && vals.push({ x: xv, v: s[i] }));
    if (vals.length > 5) {
      const med = [...vals].sort((a, b) => a.v - b.v)[Math.floor(vals.length / 2)].v;
      const depth = (base - med) / range;
      const min = vals.reduce((a, b) => (b.v < a.v ? b : a));
      out[r.id] = depth >= 0.15 ? { wn: Math.round(min.x), rel: depth, broad: true } : null;
    } else out[r.id] = null;
  }
  return out;
}

/** Frases que describen las diferencias más claras entre los espectros comparados. */
export function describeDifferences(names: string[], hits: Record<string, RegionHit | null>[]): string[] {
  const out: string[] = [];
  for (const r of COMPARE_REGIONS) {
    const present = hits.map((h) => h[r.id]);
    const yes = names.filter((_, i) => present[i] && present[i]!.rel >= 0.12);
    const no = names.filter((_, i) => !present[i]);
    if (yes.length && no.length) out.push(`${r.label}: banda clara en ${yes.join(' y ')} y ausente en ${no.join(' y ')} (${r.meaning}).`);
    else if (yes.length === names.length && names.length > 1) {
      const wns = present.map((p) => p!.wn);
      const spread = Math.max(...wns) - Math.min(...wns);
      if (present.some((p) => p!.broad)) continue;
      // por encima de 2000 cm⁻¹ la curva digitalizada tiene ≈8 cm⁻¹ por píxel: se exige más separación
      if (spread >= (r.lo >= 2000 ? 30 : 15)) out.push(`${r.label}: todos absorben, pero en posiciones distintas (${names.map((n, i) => `${n} ${wns[i]}`).join(', ')} cm⁻¹); una diferencia de ${spread} cm⁻¹ refleja entornos químicos distintos.`);
    }
  }
  if (!out.length) out.push('Las regiones de grupos funcionales son parecidas: compare la huella dactilar (1500–400 cm⁻¹), donde se distinguen compuestos con los mismos grupos.');
  return out;
}
