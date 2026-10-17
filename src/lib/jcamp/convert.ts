/**
 * Conversión completa JCAMP-DX → formato interno, compartida por los scripts de Node.js y el navegador.
 * Flujo: leer → validar estructura → decodificar → aplicar factores → reconstruir ejes →
 * verificar puntos y orden → detectar valores inválidos → devolver JSON + informe.
 */
import { parseJcamp, type JcampChecks, type JcampMeta } from './parse';
import { toSpectrum } from './normalize';
import { validateSpectrum, type ValidationReport } from '../validate';
import type { SpectrumData } from '../types';

export interface ConvertedSpectrum {
  blockIndex: number;
  title: string;
  dataKind: 'XYDATA' | 'XYPOINTS';
  encodings: string[];
  meta: Omit<JcampMeta, 'ldrs'> & { ldrs?: Record<string, string> };
  spectrum: SpectrumData;
  peakTable?: { x: number[]; y: number[] };
  checks: JcampChecks;
  operations: string[];
  validation: ValidationReport;
  warnings: string[];
}

export interface ConversionReport {
  fileName: string;
  ok: boolean;
  spectra: ConvertedSpectrum[];
  /** tablas de picos sin curva asociada */
  peakTablesOnly: { blockIndex: number; title: string; x: number[]; y: number[] }[];
  errors: string[];
  warnings: string[];
}

export function convertJcampText(text: string, fileName = 'archivo.jdx'): ConversionReport {
  const rep: ConversionReport = { fileName, ok: false, spectra: [], peakTablesOnly: [], errors: [], warnings: [] };
  let parsed;
  try {
    parsed = parseJcamp(text);
  } catch (e) {
    rep.errors.push(`Error inesperado al leer el archivo: ${(e as Error).message}`);
    return rep;
  }
  rep.errors.push(...parsed.errors);
  rep.warnings.push(...parsed.warnings);
  parsed.blocks.forEach((b, bi) => {
    b.errors.forEach((e) => rep.errors.push(`Bloque ${bi + 1}: ${e}`));
    const curves = b.data.filter((d) => d.kind !== 'PEAK TABLE');
    const peaks = b.data.find((d) => d.kind === 'PEAK TABLE');
    if (!curves.length && peaks) rep.peakTablesOnly.push({ blockIndex: bi, title: b.meta.title ?? '', x: peaks.x, y: peaks.y });
    for (const ds of curves) {
      const { spectrum, operations, warnings } = toSpectrum(b, ds);
      const validation = validateSpectrum(spectrum, { declaredPoints: b.meta.nPoints });
      const { ldrs, ...meta } = b.meta;
      rep.spectra.push({
        blockIndex: bi,
        title: b.meta.title ?? '',
        dataKind: ds.kind as 'XYDATA' | 'XYPOINTS',
        encodings: ds.encodings,
        meta: { ...meta, ldrs },
        spectrum,
        peakTable: peaks ? { x: peaks.x, y: peaks.y } : undefined,
        checks: ds.checks,
        operations,
        validation,
        warnings: [...b.warnings, ...warnings],
      });
    }
  });
  if (!rep.spectra.length && !rep.peakTablesOnly.length && !rep.errors.length) rep.errors.push('No se encontraron datos espectrales compatibles.');
  rep.ok = rep.spectra.some((s) => s.validation.ok) || (rep.peakTablesOnly.length > 0 && !rep.errors.length);
  return rep;
}
