import type { SpectrumData } from './types';

export interface ValidationIssue {
  level: 'error' | 'aviso';
  code: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  nPoints: number;
  nInvalid: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  monotonic: boolean;
  issues: ValidationIssue[];
}

/** Comprueba que un espectro puede representarse y es coherente con un IR medio en cm⁻¹. */
export function validateSpectrum(s: SpectrumData, opts: { declaredPoints?: number } = {}): ValidationReport {
  const issues: ValidationIssue[] = [];
  const n = s.x.length;
  if (n !== s.y.length) issues.push({ level: 'error', code: 'LEN', message: `X tiene ${n} valores e Y ${s.y.length}.` });
  if (n < 3) issues.push({ level: 'error', code: 'FEW', message: `Sólo hay ${n} puntos: no es suficiente para representar un espectro.` });
  else if (n < 50) issues.push({ level: 'aviso', code: 'FEW', message: `Sólo hay ${n} puntos: la resolución es muy baja para un espectro IR.` });
  const invalid = s.y.filter((v) => !Number.isFinite(v)).length + s.x.filter((v) => !Number.isFinite(v)).length;
  if (invalid > 0) issues.push({ level: invalid > n * 0.5 ? 'error' : 'aviso', code: 'NAN', message: `${invalid} valores no numéricos o ausentes (se dibujan como huecos).` });
  let monotonic = true;
  for (let i = 1; i < n; i++) if (!(s.x[i] > s.x[i - 1])) { monotonic = false; break; }
  if (!monotonic) issues.push({ level: 'error', code: 'ORDER', message: 'El eje X no es estrictamente creciente tras la normalización.' });
  const fx = s.x.filter(Number.isFinite);
  const fy = s.y.filter(Number.isFinite);
  const ext = (a: number[]) => a.reduce((m, v) => [Math.min(m[0], v), Math.max(m[1], v)], [Infinity, -Infinity]);
  const [xMin, xMax] = fx.length ? ext(fx) : [NaN, NaN];
  const [yMin, yMax] = fy.length ? ext(fy) : [NaN, NaN];
  if (!s.xUnits || s.xUnits !== 'cm-1') issues.push({ level: 'aviso', code: 'XUNITS', message: `Unidades del eje X: ${s.xUnits || 'no indicadas'} (se esperaba cm⁻¹).` });
  else if (xMin < 100 || xMax > 15000) issues.push({ level: 'aviso', code: 'XRANGE', message: `Intervalo ${xMin.toFixed(0)}–${xMax.toFixed(0)} cm⁻¹ fuera del IR habitual (100–15000).` });
  if (!s.yUnits) issues.push({ level: 'aviso', code: 'YUNITS', message: 'No se indican las unidades del eje Y.' });
  if (s.signal === 'transmittance') {
    const lim = s.yScale === 'percent' ? [-5, 130] : [-0.05, 1.3];
    if (yMin < lim[0] || yMax > lim[1]) issues.push({ level: 'aviso', code: 'YRANGE', message: `Transmitancia fuera del intervalo esperado (${yMin.toFixed(2)} a ${yMax.toFixed(2)}).` });
  }
  if (opts.declaredPoints !== undefined && opts.declaredPoints !== n) issues.push({ level: 'aviso', code: 'NPOINTS', message: `Se declaran ${opts.declaredPoints} puntos y hay ${n}.` });
  return { ok: !issues.some((i) => i.level === 'error'), nPoints: n, nInvalid: invalid, xMin, xMax, yMin, yMax, monotonic, issues };
}
