import { describe, expect, it } from 'vitest';
import { validateSpectrum } from '../src/lib/validate';
import { parseDelimited, parseSpectrumJson } from '../src/lib/tabular';

const base = { xUnits: 'cm-1', yUnits: 'TRANSMITTANCE', yLabel: '', signal: 'transmittance' as const, yScale: 'percent' as const };

describe('validación', () => {
  it('acepta un espectro correcto', () => {
    const x = Array.from({ length: 100 }, (_, i) => 400 + i * 36);
    const r = validateSpectrum({ ...base, x, y: x.map(() => 90) });
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
  });
  it('detecta eje no monótono, pocos puntos y valores inválidos', () => {
    const r = validateSpectrum({ ...base, x: [1, 3, 2, 4, 5], y: [1, NaN, 3, 4, 5] });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['ORDER', 'FEW', 'NAN']));
  });
  it('avisa si la transmitancia está fuera de intervalo', () => {
    const x = Array.from({ length: 20 }, (_, i) => 1000 + i);
    const r = validateSpectrum({ ...base, x, y: x.map(() => 500) });
    expect(r.issues.map((i) => i.code)).toContain('YRANGE');
  });
});

describe('CSV / TXT / JSON', () => {
  it('CSV con encabezado y comas', () => {
    const t = parseDelimited('wavenumber,T\n4000,95.1\n3999,95.0\n3998,94.8\n');
    expect(t.headerDetected).toBe(true);
    expect(t.columns).toEqual(['wavenumber', 'T']);
    expect(t.rows).toHaveLength(3);
  });
  it('punto y coma con coma decimal', () => {
    const t = parseDelimited('4000;95,1\n3999;95,0\n3998;94,8\n');
    expect(t.delimiter).toBe(';');
    expect(t.decimalComma).toBe(true);
    expect(t.rows[0]).toEqual([4000, 95.1]);
  });
  it('TXT separado por espacios con tres columnas', () => {
    const t = parseDelimited('# comentario\n4000  0.1  95\n3990  0.2  94\n3980  0.3  93\n');
    expect(t.delimiter).toBe(' ');
    expect(t.rows[1]).toEqual([3990, 0.2, 94]);
  });
  it('JSON en varias formas', () => {
    expect(parseSpectrumJson('{"x":[1,2],"y":[3,4]}').y).toEqual([3, 4]);
    expect(parseSpectrumJson('[[1,3],[2,4]]').x).toEqual([1, 2]);
    expect(parseSpectrumJson('{"data":{"x":[1],"y":[null]}}').y[0]).toBeNaN();
    expect(() => parseSpectrumJson('{"a":1}')).toThrow();
  });
});
