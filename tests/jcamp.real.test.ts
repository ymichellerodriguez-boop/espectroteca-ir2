/**
 * Pruebas con archivos JCAMP-DX reales (NIST, Coblentz Society, Sadtler y ejemplos del paquete jcamp).
 * Se obtienen con `npm run fixtures:real`; si no están presentes, las pruebas se omiten.
 * Cada archivo se compara punto a punto con la biblioteca de referencia jcampconverter (cheminfo/Zakodium).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convert } from 'jcampconverter';
import { parseJcamp } from '../src/lib/jcamp/parse';
import { convertJcampText } from '../src/lib/jcamp/convert';

const DIR = join(__dirname, 'fixtures', 'real');
const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.jdx')).sort() : [];
const read = (f: string) => {
  const b = readFileSync(join(DIR, f));
  const u = b.toString('utf8');
  return u.includes('�') ? b.toString('latin1') : u;
};

describe.skipIf(files.length === 0)('archivos reales frente a jcampconverter', () => {
  it('hay al menos 60 archivos de prueba', () => {
    expect(files.length).toBeGreaterThanOrEqual(60);
  });

  for (const f of files) {
    if (f === 'example_compound_file.jdx') continue; // la referencia no decodifica este archivo (ver prueba aparte)
    it(f, () => {
      const txt = read(f);
      const mine = parseJcamp(txt);
      const ref = convert(txt, { keepRecordsRegExp: /.*/ }) as unknown as { flatten: { spectra?: { data?: { x: number[]; y: number[] } }[] }[] };
      const refData = ref.flatten.map((b) => b.spectra?.[0]?.data).filter(Boolean) as { x: number[]; y: number[] }[];
      const myData = mine.blocks.flatMap((b) => b.data.filter((d) => d.kind !== 'PEAK TABLE'));
      expect(mine.blocks.flatMap((b) => b.errors)).toEqual([]);
      expect(myData.length).toBe(refData.length);
      refData.forEach((r, i) => {
        const m = myData[i];
        expect(m.x.length).toBe(r.x.length);
        const scale = Math.max(...r.y.map(Math.abs)) || 1;
        let dy = 0;
        let dx = 0;
        for (let k = 0; k < r.x.length; k++) {
          dy = Math.max(dy, Math.abs(r.y[k] - m.y[k]) / scale);
          dx = Math.max(dx, Math.abs(r.x[k] - m.x[k]));
        }
        expect(dy).toBeLessThan(1e-9);
        expect(dx).toBeLessThan(1e-6);
        if (m.checks.nPointsDeclared !== undefined) expect(m.checks.nPointsMatch).toBe(true);
        expect(m.checks.yCheckFailures).toBe(0);
      });
      // la conversión completa produce un espectro válido y representable
      const rep = convertJcampText(txt, f);
      expect(rep.ok).toBe(true);
      for (const s of rep.spectra) {
        expect(s.validation.monotonic).toBe(true);
        expect(s.spectrum.xUnits).toBe('cm-1');
      }
    });
  }

  it('archivo compuesto (2 bloques XYPOINTS): coincide con el lector Python «jcamp»', () => {
    // valores obtenidos con jcamp.readfile() de jcamp 1.3.2 (segunda referencia independiente)
    const r = parseJcamp(read('example_compound_file.jdx'));
    expect(r.blocks).toHaveLength(2);
    const sums = r.blocks.map((b) => b.data[0].y.reduce((a, c) => a + c, 0));
    expect(r.blocks[0].data[0].x).toHaveLength(2074);
    expect(sums[0]).toBeCloseTo(331.472659, 5);
    expect(sums[1]).toBeCloseTo(1244.169707, 5);
  });

  it('archivo ASDF (DIF/DUP/SQZ) real', () => {
    const r = parseJcamp(read('isopropanol_ASDF.jdx'));
    const d = r.blocks[0].data[0];
    expect(d.encodings).toEqual(expect.arrayContaining(['DIF', 'SQZ']));
    expect(d.checks.yCheckCount).toBeGreaterThan(100);
    expect(d.checks.yCheckFailures).toBe(0);
  });
});
