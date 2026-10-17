import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { describeDifferences, regionHits } from '../src/features/compare/regions';
import { applyFilters, EMPTY_FILTERS } from '../src/features/library/filters';
import type { CompoundIndexEntry, SpectrumRecord } from '../src/lib/types';

const rec = (id: string) => JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', 'spectra', `${id}.json`), 'utf8')) as SpectrumRecord;
const lib = (JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', 'library.json'), 'utf8')) as { compounds: CompoundIndexEntry[] }).compounds;

describe('comparador', () => {
  it('reconoce la O–H muy ancha del ácido butírico y el C=O que falta en el 1-butanol', () => {
    const a = rec('1-butanol');
    const b = rec('butyric-acid');
    const ha = regionHits(a.data!.x, a.data!.y, 'transmittance');
    const hb = regionHits(b.data!.x, b.data!.y, 'transmittance');
    expect(hb.xh).not.toBeNull();
    expect(ha.co).toBeNull();
    expect(hb.co!.wn).toBeGreaterThan(1690);
    const d = describeDifferences(['1-butanol', 'ácido butírico'], [ha, hb]).join(' ');
    expect(d).toMatch(/C=O: banda clara en ácido butírico y ausente en 1-butanol/);
    expect(d).not.toMatch(/O–H \/ N–H: banda clara en 1-butanol y ausente/);
  });
});

describe('filtros de la biblioteca', () => {
  it('combina categoría y número de onda', () => {
    const r = applyFilters(lib, { ...EMPTY_FILTERS, categories: ['fenoles'], wn: 1250, tol: 15 });
    expect(r.length).toBeGreaterThan(5);
    expect(r.every((c) => c.categories.includes('fenoles') && c.peakWavenumbers.some((w) => Math.abs(w - 1250) <= 15))).toBe(true);
  });
  it('busca por sinónimo, fórmula, número y enlace', () => {
    expect(applyFilters(lib, { ...EMPTY_FILTERS, q: 'paracetamol' }).map((c) => c.id)).toEqual(['4-hydroxyacetanilide']);
    expect(applyFilters(lib, { ...EMPTY_FILTERS, q: 'C8H10' }).length).toBeGreaterThanOrEqual(5);
    expect(applyFilters(lib, { ...EMPTY_FILTERS, q: 'c=o' }).every((c) => c.bonds.includes('C=O'))).toBe(true);
    expect(applyFilters(lib, { ...EMPTY_FILTERS, q: 'acetofenona' })[0].id).toBe('acetophenone');
  });
  it('filtra por estado de verificación y por enlace', () => {
    expect(applyFilters(lib, { ...EMPTY_FILTERS, status: 'requiere-revision' }).map((c) => c.id)).toEqual(['butyl-acetate']);
    expect(applyFilters(lib, { ...EMPTY_FILTERS, bonds: ['N–O'] }).length).toBe(2);
  });
});
