import { describe, expect, it } from 'vitest';
import { assignKnownStructure, candidatesFor, interpretUnknown } from '../src/lib/assign';
import { REFERENCE_BANDS, bandsAt } from '../src/lib/bands';

describe('base de referencia', () => {
  it('cubre todos los enlaces exigidos', () => {
    const fam = new Set(REFERENCE_BANDS.map((b) => b.bondFamily));
    for (const f of ['O–H', 'N–H', 'C–H sp³', 'C–H sp²', 'C–H sp', 'C=O', 'C=C', 'C≡C', 'C≡N', 'C–O', 'C–N', 'N–O', 'C–X']) expect(fam.has(f)).toBe(true);
  });
  it('los intervalos están bien formados y citan fuentes', () => {
    for (const b of REFERENCE_BANDS) {
      expect(b.hi).toBeGreaterThan(b.lo);
      expect(b.sources.length).toBeGreaterThan(0);
    }
  });
  it('bandsAt devuelve los candidatos de 1715 cm⁻¹', () => {
    const ids = bandsAt(1715).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(['co-ketone', 'co-acid', 'co-ald']));
  });
});

describe('asignación con estructura conocida', () => {
  it('acetona: C=O de cetona saturada con confianza alta', () => {
    const r = assignKnownStructure([{ wn: 1715, y: 4 }, { wn: 3005, y: 70 }, { wn: 1363, y: 20 }, { wn: 1222, y: 25 }], { groups: ['cetona'], flags: ['tiene-ch-sp3'], technique: 'LIQUID FILM' });
    const co = r.assignments.find((a) => a.refId === 'co-ketone')!;
    expect(co.observed).toBe(1715);
    expect(co.confidence).toBe('alta');
    expect(co.level).toBe('propuesta');
  });
  it('amida primaria: busca dos bandas N–H', () => {
    const r = assignKnownStructure([{ wn: 3350, y: 10 }, { wn: 3180, y: 12 }, { wn: 1680, y: 5 }, { wn: 1620, y: 20 }], { groups: ['amida-primaria'] });
    expect(r.assignments.filter((a) => a.refId === 'nh-amide')).toHaveLength(2);
  });
  it('señala las ausencias diagnósticas', () => {
    const r = assignKnownStructure([{ wn: 2950, y: 10 }], { groups: ['ester'] });
    expect(r.missing.map((m) => m.band.id)).toContain('co-ester');
  });
  it('baja la confianza cuando la lectura no es fiable', () => {
    const r = assignKnownStructure([{ wn: 1715, y: 5, reliable: false }], { groups: ['cetona'] });
    expect(r.assignments[0].confidence).toBe('baja');
  });
  it('añade la advertencia del Nujol a las bandas C–H', () => {
    const r = assignKnownStructure([{ wn: 2925, y: 5 }], { groups: ['alquilo'], technique: 'NUJOL MULL' });
    expect(r.assignments[0].explanation).toMatch(/Nujol/);
  });
});

describe('interpretación de un espectro desconocido', () => {
  it('propone ácido carboxílico con O–H muy ancha + C=O', () => {
    const h = interpretUnknown([
      { wn: 3000, y: 30, intensity: 'fuerte', shape: 'muy ancha' },
      { wn: 1710, y: 5, intensity: 'fuerte', shape: 'aguda' },
      { wn: 1290, y: 30, intensity: 'fuerte', shape: 'media' },
    ]);
    expect(h.find((x) => x.group === 'acido')?.confidence).toBe('alta');
  });
  it('propone nitrilo y no inventa grupos sin evidencia', () => {
    const h = interpretUnknown([
      { wn: 2250, y: 40, intensity: 'media', shape: 'aguda' },
      { wn: 2950, y: 40, intensity: 'media', shape: 'aguda' },
    ]);
    expect(h.map((x) => x.group)).toContain('nitrilo');
    expect(h.map((x) => x.group)).not.toContain('acido');
  });
  it('candidatos por intervalo para cada pico', () => {
    const c = candidatesFor([{ wn: 1740, y: 10 }]);
    expect(c[0].candidates.some((x) => x.band.id === 'co-ester')).toBe(true);
  });
});

describe('reglas éster frente a cetona', () => {
  it('acetona (C=O 1715 + C–C–C 1222 intensa) se interpreta como cetona, no como éster', () => {
    const h = interpretUnknown([
      { wn: 3005, y: 80, intensity: 'débil', shape: 'aguda' },
      { wn: 1715, y: 4, intensity: 'fuerte', shape: 'media' },
      { wn: 1363, y: 20, intensity: 'fuerte', shape: 'aguda' },
      { wn: 1222, y: 22, intensity: 'fuerte', shape: 'media' },
    ]).map((x) => x.group);
    expect(h).toContain('cetona');
    expect(h).not.toContain('ester');
  });
  it('acetato de etilo (C=O 1743 + C–O 1243 y 1048) se interpreta como éster', () => {
    const h = interpretUnknown([
      { wn: 2983, y: 60, intensity: 'media', shape: 'aguda' },
      { wn: 1743, y: 3, intensity: 'fuerte', shape: 'media' },
      { wn: 1243, y: 4, intensity: 'fuerte', shape: 'ancha' },
      { wn: 1048, y: 20, intensity: 'fuerte', shape: 'media' },
    ]);
    expect(h.find((x) => x.group === 'ester')?.confidence).toBe('alta');
    expect(h.map((x) => x.group)).not.toContain('cetona');
  });
});
