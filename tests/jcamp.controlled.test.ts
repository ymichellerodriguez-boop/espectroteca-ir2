import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseJcamp, canonicalLabel } from '../src/lib/jcamp/parse';
import { convertJcampText } from '../src/lib/jcamp/convert';

const F = (n: string) => readFileSync(join(__dirname, 'fixtures', 'controlled', n), 'utf8');
const first = (n: string) => parseJcamp(F(n)).blocks[0];

describe('etiquetas', () => {
  it('canoniza etiquetas JCAMP', () => {
    expect(canonicalLabel('DATA TYPE')).toBe('DATATYPE');
    expect(canonicalLabel('Cas Registry_No')).toBe('CASREGISTRYNO');
    expect(canonicalLabel('JCAMP-DX')).toBe('JCAMPDX');
  });
});

describe('XYDATA (X++(Y..Y))', () => {
  it('AFFN: metadatos, número de puntos y ejes', () => {
    const b = first('affn.jdx');
    expect(b.meta.title).toBe('Prueba AFFN controlada');
    expect(b.meta.jcampVersion).toBe('4.24');
    expect(b.meta.dataType).toBe('INFRARED SPECTRUM');
    expect(b.meta.xUnits).toBe('1/CM');
    expect(b.meta.yUnits).toBe('TRANSMITTANCE');
    const d = b.data[0];
    expect(d.x).toEqual([1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009]);
    expect(d.y).toEqual([0.95, 0.94, 0.9, 0.8, 0.6, 0.8, 0.9, 0.94, 0.95, 0.95]);
    expect(d.checks.nPointsMatch).toBe(true);
    expect(d.checks.abscissaMaxDeviation).toBe(0);
  });
  it('PAC con XFACTOR y YFACTOR', () => {
    const d = first('pac.jdx').data[0];
    expect(d.encodings).toContain('PAC');
    expect(d.x[0]).toBe(2000);
    expect(d.x[7]).toBeCloseTo(2003.5, 10);
    expect(d.y.map((v) => +v.toFixed(6))).toEqual([0.01, 0.02, -0.005, 0.4, 0.8, 0.3, -0.012, 0.007]);
    expect(d.checks.abscissaMaxDeviation).toBe(0);
  });
  it('ASDF (SQZ/DIF/DUP) con control de ordenada correcto', () => {
    const d = first('asdf.jdx').data[0];
    expect(d.y).toEqual([100, 102, 104, 104, 104, 103, 104, 105].map((v) => v * 0.5));
    expect(d.checks.yCheckCount).toBe(1);
    expect(d.checks.yCheckFailures).toBe(0);
    expect(d.checks.nPointsMatch).toBe(true);
    expect(d.checks.abscissaMaxDeviation).toBe(0);
  });
  it('detecta un control de ordenada incorrecto sin interrumpir la lectura', () => {
    const b = first('asdf-ycheck-bad.jdx');
    expect(b.data[0].checks.yCheckFailures).toBe(1);
    expect(b.warnings.join(' ')).toMatch(/Y-check/);
  });
  it('avisa cuando NPOINTS no coincide', () => {
    const b = first('npoints-mismatch.jdx');
    expect(b.data[0].checks.nPointsMatch).toBe(false);
    expect(b.warnings.join(' ')).toMatch(/NPOINTS declara 20/);
  });
});

describe('XYPOINTS, PEAK TABLE y bloques', () => {
  it('XYPOINTS en absorbancia y tabla de picos asociada', () => {
    const b = first('xypoints.jdx');
    expect(b.data.map((d) => d.kind)).toEqual(['XYPOINTS', 'PEAK TABLE']);
    expect(b.data[0].y).toEqual([0.1, 0.25, 0.9, 0.3, 0.12]);
    expect(b.data[1].x).toEqual([1715]);
  });
  it('PEAK TABLE (XYW..XYW) sin curva', () => {
    const r = convertJcampText(F('peaktable-only.jdx'));
    expect(r.spectra).toHaveLength(0);
    expect(r.peakTablesOnly[0].x).toEqual([3340, 2950, 1050]);
  });
  it('archivo compuesto: devuelve los dos bloques de datos y omite el contenedor', () => {
    const r = parseJcamp(F('compuesto.jdx'));
    expect(r.blocks).toHaveLength(2);
    expect(r.blocks[1].data[0].y).toEqual([0.4, 0.5, 0.6]);
  });
});

describe('errores informados sin excepción', () => {
  it('NTUPLES no es compatible', () => {
    const r = convertJcampText(F('ntuples.jdx'));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/NTUPLES/);
  });
  it('carácter no válido en los datos', () => {
    const r = convertJcampText(F('broken.jdx'));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/no válido/);
  });
  it('texto que no es JCAMP', () => {
    const r = convertJcampText('hola, esto no es un espectro');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/etiquetas JCAMP-DX/);
  });
});

describe('normalización', () => {
  it('convierte µm a cm⁻¹ y registra la operación; reordena de forma creciente', () => {
    const r = convertJcampText(F('micrometers.jdx'));
    const s = r.spectra[0];
    expect(s.spectrum.x.map((v) => +v.toFixed(3))).toEqual([1000, 1333.333, 2000, 4000]);
    expect(s.spectrum.y).toEqual([60, 70, 80, 90]);
    expect(s.operations.join(' ')).toMatch(/µm a cm⁻¹/);
    expect(s.operations.join(' ')).toMatch(/reordenados/);
  });
  it('identifica transmitancia en fracción y absorbancia sin transformarlas', () => {
    const t = convertJcampText(F('affn.jdx')).spectra[0];
    expect(t.spectrum.signal).toBe('transmittance');
    expect(t.spectrum.yScale).toBe('fraction');
    const a = convertJcampText(F('pac.jdx')).spectra[0];
    expect(a.spectrum.signal).toBe('absorbance');
    expect(a.operations.join(' ')).toMatch(/YFACTOR/);
    expect(a.operations.join(' ')).not.toMatch(/transmitancia/i);
  });
});
