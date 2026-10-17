import type { JcampBlock, JcampDataSet } from './parse';
import type { SignalKind, SpectrumData } from '../types';

/** Clasifica las unidades del eje Y sin transformar los datos. */
export function classifyY(yUnits: string | undefined, y: number[]): { kind: SignalKind; scale: 'percent' | 'fraction' | 'arbitrary'; label: string } {
  const u = (yUnits ?? '').toUpperCase();
  const finite = y.filter(Number.isFinite);
  const max = finite.length ? Math.max(...finite) : 0;
  if (/TRANSMIT|%T|^T$/.test(u)) {
    const scale = max <= 1.5 ? 'fraction' : 'percent';
    return { kind: 'transmittance', scale, label: scale === 'percent' ? 'Transmitancia (%)' : 'Transmitancia (fracción)' };
  }
  if (/ABSORBANCE|^A$|ABS/.test(u)) return { kind: 'absorbance', scale: 'arbitrary', label: 'Absorbancia' };
  if (/MOL.*M-1|MOL\)-1|ABSORPTIV|BASE 10/.test(u)) return { kind: 'absorbance', scale: 'arbitrary', label: `Absortividad (${yUnits})` };
  if (/REFLECT/.test(u)) return { kind: 'other', scale: 'arbitrary', label: `Reflectancia (${yUnits})` };
  return { kind: 'other', scale: 'arbitrary', label: yUnits ? `Señal (${yUnits})` : 'Señal (unidades no indicadas)' };
}

/** Convierte un conjunto de datos JCAMP al formato interno, registrando cada operación aplicada. */
export function toSpectrum(block: JcampBlock, ds: JcampDataSet): { spectrum: SpectrumData; operations: string[]; warnings: string[] } {
  const ops: string[] = [];
  const warnings: string[] = [];
  let x = ds.x.slice();
  let y = ds.y.slice();
  if (block.meta.xFactor !== undefined && block.meta.xFactor !== 1) ops.push(`X multiplicada por XFACTOR = ${block.meta.xFactor}`);
  if (block.meta.yFactor !== undefined && block.meta.yFactor !== 1) ops.push(`Y multiplicada por YFACTOR = ${block.meta.yFactor}`);
  const xu = (block.meta.xUnits ?? '').toUpperCase().replace(/\s/g, '');
  let xUnits = 'cm-1';
  if (/^1\/CM$|^CM-1$|^CM\^-1$|WAVENUMBER|^1\/CENTIMETERS?$/.test(xu)) {
    // ya en cm-1
  } else if (/MICROMETER|MICRON|^UM$|^µM$/.test(xu)) {
    x = x.map((v) => 1e4 / v);
    ops.push('X convertida de µm a cm⁻¹ (ṽ = 10⁴ / λ)');
  } else if (/NANOMETER|^NM$/.test(xu)) {
    x = x.map((v) => 1e7 / v);
    ops.push('X convertida de nm a cm⁻¹ (ṽ = 10⁷ / λ)');
  } else {
    xUnits = block.meta.xUnits ?? 'desconocidas';
    warnings.push(`Unidades del eje X no reconocidas (${block.meta.xUnits ?? 'no indicadas'}); se muestran sin convertir.`);
  }
  if (x.length > 1 && x[0] > x[x.length - 1]) {
    x = x.reverse();
    y = y.reverse();
    ops.push('Puntos reordenados por número de onda creciente (los valores no cambian)');
  }
  const cls = classifyY(block.meta.yUnits, y);
  return {
    spectrum: { x, y, xUnits, yUnits: block.meta.yUnits ?? '', yLabel: cls.label, signal: cls.kind, yScale: cls.scale },
    operations: ops,
    warnings,
  };
}
