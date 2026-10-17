import { candidatesFor, interpretUnknown, type Hypothesis, type UnknownPeak } from '../../lib/assign';
import { REFERENCE_BANDS, sourceText } from '../../lib/bands';
import type { DetectedPeak } from '../../lib/peaks';
import type { Assignment } from '../../lib/types';

/** Mapa hipótesis → códigos de grupo de las bandas de referencia. */
const HYP_GROUPS: Record<string, string[]> = {
  acido: ['acido'],
  aldehido: ['aldehido'],
  ester: ['ester'],
  amida: ['amida-primaria', 'amida-secundaria', 'amida-terciaria', 'lactama', 'urea'],
  cetona: ['cetona'],
  'alcohol-fenol': ['alcohol', 'fenol'],
  amina: ['amina'],
  nitrilo: ['nitrilo'],
  alquino: ['alquino'],
  nitro: ['nitro'],
  aromatico: ['aromatico'],
  alqueno: ['alqueno'],
  eter: ['eter', 'eter-aromatico'],
  alcano: ['alcano', 'alquilo'],
};

export function toUnknown(p: DetectedPeak): UnknownPeak {
  return { wn: p.x, y: p.y, widthCm: p.widthCm, intensity: p.intensity, shape: p.shape };
}

/**
 * Propone una asignación por pico relevante (intensidad fuerte o media): entre los intervalos que lo
 * contienen se prefiere el de un grupo apoyado por las hipótesis, después el intervalo más estrecho.
 * Todas son «propuestas» con confianza media o baja: el usuario debe revisarlas.
 */
export function proposeForUnknown(peaks: DetectedPeak[]): { hypotheses: Hypothesis[]; assignments: Assignment[] } {
  const up = peaks.map(toUnknown);
  const hypotheses = interpretUnknown(up);
  const supported = new Set(hypotheses.flatMap((h) => HYP_GROUPS[h.group] ?? []));
  const out: Assignment[] = [];
  for (const pc of candidatesFor(up, 0)) {
    const p = pc.peak;
    if (p.intensity === 'débil' && p.wn < 1500) continue; // huella dactilar débil: no se asigna
    const cands = pc.candidates.filter((c) => c.fit === 'dentro' && c.band.groups.length);
    if (!cands.length) continue;
    cands.sort((a, b) => {
      const sa = a.band.groups.some((g) => supported.has(g)) ? 0 : 1;
      const sb = b.band.groups.some((g) => supported.has(g)) ? 0 : 1;
      return sa - sb || a.band.hi - a.band.lo - (b.band.hi - b.band.lo);
    });
    const best = cands[0].band;
    const backed = best.groups.some((g) => supported.has(g));
    const fingerprint = p.wn < 1500;
    out.push({
      id: `auto-${best.id}-${Math.round(p.wn)}`,
      observed: p.wn,
      observedY: p.y,
      rangeMin: best.lo,
      rangeMax: best.hi,
      bond: best.bond,
      group: best.group,
      vibration: best.vibration,
      intensity: p.intensity,
      shape: p.shape,
      explanation: `${best.explanation}${cands.length > 1 ? ` Otras posibilidades en este intervalo: ${cands.slice(1, 4).map((c) => c.band.group).join('; ')}.` : ''}${fingerprint ? ' Está en la huella dactilar: la asignación aislada es poco fiable.' : ''}`,
      support: [],
      confidence: backed && !fingerprint ? 'media' : 'baja',
      source: sourceText(best.sources),
      level: 'propuesta',
      refId: best.id,
    });
  }
  for (const a of out) {
    const fam = REFERENCE_BANDS.find((b) => b.id === a.refId)!;
    a.support = out.filter((o) => o !== a && REFERENCE_BANDS.find((b) => b.id === o.refId)!.groups.some((g) => fam.groups.includes(g))).map((o) => `${o.bond} a ${Math.round(o.observed)} cm⁻¹`);
  }
  return { hypotheses, assignments: out };
}
