/** Integridad de la biblioteca publicada (public/data). Ejecute antes `npm run library:build`. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CategoryInfo, CompoundIndexEntry, SpectrumRecord } from '../src/lib/types';

const PUB = join(__dirname, '..', 'public');
const lib = JSON.parse(readFileSync(join(PUB, 'data', 'library.json'), 'utf8')) as { compounds: CompoundIndexEntry[] };
const cats = JSON.parse(readFileSync(join(PUB, 'data', 'categories.json'), 'utf8')) as { categories: CategoryInfo[] };

describe('biblioteca publicada', () => {
  it('identificadores únicos y ficha para cada compuesto', () => {
    const ids = lib.compounds.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(existsSync(join(PUB, 'data', 'spectra', `${id}.json`))).toBe(true);
  });
  it('cada imagen original existe y cada ficha documenta su procedencia', () => {
    for (const c of lib.compounds) {
      if (c.originalImage) expect(existsSync(join(PUB, c.originalImage))).toBe(true);
      expect(c.source.name).toBeTruthy();
      expect(c.formula).toMatch(/^C/);
    }
  });
  it('al menos 12 categorías definidas y al menos 10 con espectros', () => {
    expect(cats.categories.filter((c) => c.required)).toHaveLength(12);
    expect(cats.categories.filter((c) => c.count > 0).length).toBeGreaterThanOrEqual(10);
  });
  it('los recuentos de categoría coinciden con el índice', () => {
    for (const c of cats.categories) expect(c.count).toBe(lib.compounds.filter((x) => x.categories.includes(c.id)).length);
  });
  it('los datos de cada ficha son representables y en cm⁻¹ crecientes', () => {
    for (const c of lib.compounds) {
      const r = JSON.parse(readFileSync(join(PUB, 'data', 'spectra', `${c.id}.json`), 'utf8')) as SpectrumRecord;
      expect(r.data).toBeDefined();
      const x = r.data!.x;
      expect(x.length).toBe(r.data!.y.length);
      expect(x.length).toBeGreaterThan(300);
      for (let i = 1; i < x.length; i++) expect(x[i]).toBeGreaterThan(x[i - 1]);
      expect(Math.min(...x)).toBeGreaterThanOrEqual(350);
      expect(Math.max(...x)).toBeLessThanOrEqual(4000);
      for (const v of r.data!.y) if (v !== null) expect(v).toBeGreaterThanOrEqual(-1), expect(v).toBeLessThanOrEqual(101);
      expect(r.assignments.every((a) => a.level === 'propuesta')).toBe(true);
    }
  });
  it('la fórmula y el nombre de ejemplos conocidos son correctos', () => {
    const f = (id: string) => lib.compounds.find((c) => c.id === id)!;
    expect(f('methanol').formula).toBe('CH4O');
    expect(f('4-hydroxyacetanilide').synonyms).toContain('paracetamol');
    expect(f('3-methyl-1-pentanol').verificationStatus).toBe('discrepancia-nombre');
    expect(f('butyl-acetate').verificationStatus).toBe('requiere-revision');
    expect(lib.compounds.some((c) => c.id === 'ethyl-formate')).toBe(false);
  });
});
