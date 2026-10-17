/**
 * Motor de asignación de bandas.
 *  - assignKnownStructure(): para espectros de la biblioteca, donde la estructura es conocida;
 *    se busca en el espectro la evidencia de cada grupo presente (asignación PROPUESTA).
 *  - interpretUnknown(): para espectros del usuario; cada pico recibe candidatos por intervalo
 *    y se proponen hipótesis de grupo funcional con la evidencia a favor y la que falta.
 * Ninguna de las dos funciones identifica un compuesto de forma definitiva.
 */
import { REFERENCE_BANDS, type ReferenceBand, sourceText } from './bands';
import type { Assignment, SignalKind } from './types';

export interface ObservedPeak {
  wn: number;
  /** %T, absorbancia o señal en el máximo/mínimo */
  y: number;
  /** anchura a media altura estimada de la curva (cm⁻¹), si se dispone */
  widthCm?: number | null;
  /** fiabilidad del valor (p. ej. lectura OCR verificada con la curva) */
  reliable?: boolean;
  /** 'tabla' = valor de la tabla de picos de la fuente; 'curva' = mínimo/máximo estimado en la curva */
  origin?: 'tabla' | 'curva';
}

export interface StructureContext {
  groups: string[];
  flags?: string[];
  technique?: string;
}

const byId = (id: string) => {
  const b = REFERENCE_BANDS.find((r) => r.id === id);
  if (!b) throw new Error(`Banda de referencia desconocida: ${id}`);
  return b;
};

function intensityFromT(T: number): string {
  return T <= 30 ? 'fuerte' : T <= 70 ? 'media' : 'débil';
}

function shapeFromWidth(w?: number | null): string | undefined {
  if (w === undefined || w === null || !Number.isFinite(w)) return undefined;
  if (w >= 250) return 'muy ancha';
  if (w >= 70) return 'ancha';
  if (w <= 20) return 'aguda';
  return 'media';
}

/** Qué bandas se buscan para cada grupo, según la estructura y el contexto. */
function expectedBands(group: string, flags: string[], technique: string): { id: string; count?: number; diagnostic?: boolean }[] {
  const dilute = /CCL4|SOLUTION|GAS/i.test(technique);
  switch (group) {
    case 'alcohol':
      return [{ id: dilute ? 'oh-free' : 'oh-hb', diagnostic: true }, ...(dilute ? [{ id: 'oh-hb' }] : []), { id: 'co-alcohol', diagnostic: true }];
    case 'fenol':
      return [{ id: dilute ? 'oh-free' : 'oh-hb', diagnostic: true }, ...(dilute ? [{ id: 'oh-hb' }] : []), { id: 'co-phenol', diagnostic: true }];
    case 'acido':
      return [{ id: 'oh-acid', diagnostic: true }, { id: 'co-acid', diagnostic: true }, { id: 'co-acid-co' }, { id: 'oh-acid-oop' }];
    case 'cetona':
      if (flags.includes('beta-dicetona')) return [{ id: 'co-diketone-enol', diagnostic: true }, { id: 'co-ketone' }];
      if (flags.includes('anillo-5')) return [{ id: 'co-ketone-c5', diagnostic: true }];
      if (flags.includes('carbonilo-conjugado')) return [{ id: 'co-ketone-conj', diagnostic: true }];
      return [{ id: 'co-ketone', diagnostic: true }];
    case 'ester':
      return [
        { id: flags.includes('ester-vinilico') ? 'co-ester-vinyl' : flags.includes('carbonilo-conjugado') ? 'co-ester-conj' : 'co-ester', diagnostic: true },
        { id: 'co-ester-co', diagnostic: true },
        { id: 'co-ester-oc' },
      ];
    case 'amida-primaria':
      return [{ id: 'nh-amide', count: 2, diagnostic: true }, { id: 'co-amide', diagnostic: true }, { id: 'nh-bend' }];
    case 'amida-secundaria':
      return [{ id: 'nh-amide', diagnostic: true }, { id: 'co-amide', diagnostic: true }, { id: 'amide-ii' }];
    case 'amida-terciaria':
      return [{ id: 'co-amide', diagnostic: true }, { id: 'cn-aliph' }];
    case 'lactama':
      return [{ id: 'nh-amide', diagnostic: true }, { id: 'co-amide', diagnostic: true }];
    case 'urea':
      return [{ id: 'nh-amide', count: 2, diagnostic: true }, { id: 'co-amide', diagnostic: true }, { id: 'nh-bend' }];
    case 'aromatico':
      return [{ id: 'ch-sp2-arom', diagnostic: true }, { id: 'arom-ring1', diagnostic: true }, { id: 'arom-ring2' }, { id: 'arom-oop' }];
    case 'alqueno':
      return [{ id: 'ch-sp2-alk' }, { id: 'cc-alkene', diagnostic: true }, { id: 'alkene-oop' }];
    case 'eter':
      return [{ id: 'co-ether', diagnostic: true }];
    case 'eter-aromatico':
      return [{ id: 'co-arylether', diagnostic: true }];
    case 'nitro':
      return [{ id: 'no2-asym', diagnostic: true }, { id: 'no2-sym', diagnostic: true }];
    case 'halogenuro-cl':
      return [{ id: 'c-cl' }];
    case 'halogenuro-br':
      return [{ id: 'c-br' }];
    case 'alquilo':
    case 'alcano':
      return [{ id: 'ch-sp3', diagnostic: group === 'alcano' }, { id: 'ch2-bend' }, { id: 'ch3-umb' }, ...(flags.includes('cadena-larga') ? [{ id: 'ch2-rock' }] : [])];
    default:
      return [];
  }
}

const CONTEXT: Record<string, string> = {
  'carbonilo-conjugado': 'Aquí el carbonilo está conjugado, lo que explica su posición a menor número de onda que en el análogo saturado.',
  'anillo-5': 'La tensión del anillo de cinco miembros eleva la frecuencia del C=O respecto a una cetona de cadena abierta.',
  'beta-dicetona': 'Esta β-dicetona existe en buena parte como enol quelado; por eso la banda carbonílica principal cae por debajo de 1650 cm⁻¹.',
  'ester-vinilico': 'Al ser un éster vinílico, el C=O aparece por encima del de un acetato saturado.',
  'alfa-halo': 'Los halógenos en posición α elevan la frecuencia del carbonilo por efecto inductivo.',
  'puente-h-intramolecular': 'Un puente de hidrógeno intramolecular desplaza y ensancha las bandas O–H/N–H y puede bajar la del C=O.',
};

function techniqueNote(band: ReferenceBand, technique: string): string | null {
  const t = technique.toUpperCase();
  if (t.includes('NUJOL') && ['ch-sp3', 'ch2-bend', 'ch3-umb'].includes(band.id))
    return 'Muestra en suspensión de Nujol: esta banda incluye la contribución del aceite mineral y no puede atribuirse sólo a la muestra.';
  if (t.includes('KBR') && ['oh-hb', 'nh-amide'].includes(band.id))
    return 'En pastillas de KBr, el agua absorbida puede contribuir cerca de 3400 cm⁻¹.';
  if (t.includes('CCL4') && band.id === 'oh-free') return 'En disolución diluida en CCl₄ se observa la O–H libre, aguda, además de la asociada si la concentración lo permite.';
  return null;
}

export interface KnownAssignResult {
  assignments: Assignment[];
  missing: { band: ReferenceBand; group: string; note: string }[];
}

/** Asigna bandas cuando la estructura es conocida. Las asignaciones resultantes son PROPUESTAS. */
export function assignKnownStructure(peaks: ObservedPeak[], ctx: StructureContext, signal: SignalKind = 'transmittance', tol = 12): KnownAssignResult {
  const flags = ctx.flags ?? [];
  const technique = ctx.technique ?? '';
  const out: Assignment[] = [];
  const missing: KnownAssignResult['missing'] = [];
  const used = new Map<number, string>();
  const strength = (p: ObservedPeak) => (signal === 'transmittance' ? -p.y : p.y);
  const groups = [...ctx.groups];
  if (!groups.includes('alquilo') && !groups.includes('alcano') && flags.includes('tiene-ch-sp3')) groups.push('alquilo');
  for (const g of groups) {
    for (const exp of expectedBands(g, flags, technique)) {
      const band = byId(exp.id);
      const inRange = peaks.filter((p) => p.wn <= band.hi + tol && p.wn >= band.lo - tol);
      if (!inRange.length) {
        if (exp.diagnostic) {
          const isWindow = /CCL4/i.test(technique) && ((band.hi >= 1550 && band.lo <= 1580) || band.lo < 820);
          missing.push({ band, group: g, note: isWindow ? 'Región posiblemente recortada por la absorción del disolvente (CCl₄).' : `No se encontró una banda en ${band.lo}–${band.hi} cm⁻¹ en la tabla de picos.` });
        }
        continue;
      }
      // Para bandas anchas (O–H asociada, O–H de ácido) se prefiere el pico más ancho medido en la
      // curva: las C–H agudas superpuestas suelen ser más intensas pero no son la banda buscada.
      const wantsBroad = /ancha/.test(band.shape);
      const width = (p: ObservedPeak) => (p.widthCm === undefined || p.widthCm === null ? -1 : p.widthCm);
      const sorted = [...inRange].sort((a, b) =>
        wantsBroad && (width(a) >= 0 || width(b) >= 0) && Math.abs(width(b) - width(a)) > 30 ? width(b) - width(a) : strength(b) - strength(a),
      );
      const pick = sorted.slice(0, exp.count ?? 1);
      for (const p of pick) {
        const inside = p.wn <= band.hi && p.wn >= band.lo;
        const T = p.y;
        const intensity = signal === 'transmittance' ? intensityFromT(T) : undefined;
        const strongExpected = /fuerte/.test(band.intensity);
        let confidence: Assignment['confidence'] = 'media';
        if (inside && p.reliable !== false && (!strongExpected || (intensity && intensity !== 'débil'))) confidence = exp.diagnostic ? 'alta' : 'media';
        if (!inside || p.reliable === false) confidence = 'baja';
        if (strongExpected && intensity === 'débil') confidence = 'baja';
        if (p.origin === 'curva' && confidence === 'alta') confidence = 'media';
        const notes: string[] = [band.explanation];
        for (const f of flags) if (CONTEXT[f] && band.bondFamily === 'C=O') notes.push(CONTEXT[f]);
        if (flags.includes('puente-h-intramolecular') && (band.bondFamily === 'O–H' || band.bondFamily === 'N–H')) notes.push(CONTEXT['puente-h-intramolecular']);
        const tn = techniqueNote(band, technique);
        if (tn) notes.push(tn);
        if (p.origin === 'curva') notes.push('Posición estimada sobre la curva digitalizada: este máximo de absorción no figura en la tabla de picos de la fuente.');
        if (!inside) notes.push(`El valor observado queda ligeramente fuera del intervalo orientativo (${band.lo}–${band.hi} cm⁻¹).`);
        const key = Math.round(p.wn);
        const prev = used.get(key);
        if (prev && prev !== band.id) notes.push('Este pico también se usa en otra asignación: puede haber solapamiento de bandas.');
        used.set(key, band.id);
        out.push({
          id: `${band.id}-${key}`,
          observed: p.wn,
          observedY: p.y,
          rangeMin: band.lo,
          rangeMax: band.hi,
          bond: band.bond,
          group: band.group,
          vibration: band.vibration,
          intensity,
          shape: shapeFromWidth(p.widthCm),
          explanation: notes.join(' '),
          support: [],
          confidence,
          source: sourceText(band.sources),
          level: 'propuesta',
          refId: band.id,
        });
      }
    }
  }
  // señales que apoyan: otras asignaciones del mismo grupo funcional
  for (const a of out) {
    const fam = REFERENCE_BANDS.find((b) => b.id === a.refId)!;
    a.support = out
      .filter((o) => o !== a && REFERENCE_BANDS.find((b) => b.id === o.refId)!.groups.some((g) => fam.groups.includes(g)))
      .map((o) => `${o.bond} a ${Math.round(o.observed)} cm⁻¹`);
  }
  out.sort((a, b) => b.observed - a.observed);
  return { assignments: out, missing };
}

// ---------------------------------------------------------------------------------------------
// Espectros desconocidos
// ---------------------------------------------------------------------------------------------

export interface UnknownPeak extends ObservedPeak {
  intensity?: 'fuerte' | 'media' | 'débil';
  shape?: string;
}

export interface PeakCandidates {
  peak: UnknownPeak;
  candidates: { band: ReferenceBand; fit: 'dentro' | 'borde' }[];
}

export interface Hypothesis {
  group: string;
  label: string;
  confidence: 'alta' | 'media' | 'baja';
  evidence: string[];
  missing: string[];
  against: string[];
}

const has = (ps: UnknownPeak[], hi: number, lo: number, pred: (p: UnknownPeak) => boolean = () => true) =>
  ps.filter((p) => p.wn <= hi && p.wn >= lo && pred(p));
const strong = (p: UnknownPeak) => p.intensity === 'fuerte' || p.intensity === 'media';
const broad = (p: UnknownPeak) => p.shape === 'ancha' || p.shape === 'muy ancha';
const fmt = (ps: UnknownPeak[]) => ps.map((p) => `${Math.round(p.wn)}`).join(', ') + ' cm⁻¹';

export function candidatesFor(peaks: UnknownPeak[], margin = 10): PeakCandidates[] {
  return peaks.map((peak) => ({
    peak,
    candidates: REFERENCE_BANDS.filter((b) => peak.wn <= b.hi + margin && peak.wn >= b.lo - margin).map((band) => ({
      band,
      fit: peak.wn <= band.hi && peak.wn >= band.lo ? ('dentro' as const) : ('borde' as const),
    })),
  }));
}

/** Hipótesis de grupos funcionales para un espectro desconocido, con evidencia explícita. */
export function interpretUnknown(peaks: UnknownPeak[]): Hypothesis[] {
  const H: Hypothesis[] = [];
  const co = has(peaks, 1830, 1630, strong);
  const ohBroad = has(peaks, 3550, 3150, (p) => strong(p) && broad(p));
  const acidOH = has(peaks, 3300, 2500, (p) => p.shape === 'muy ancha');
  const nh = has(peaks, 3500, 3150, (p) => strong(p) && !(p.shape === 'muy ancha'));
  const csp2 = has(peaks, 3100, 3000);
  const csp3 = has(peaks, 3000, 2840);
  const ald = has(peaks, 2760, 2690);
  const cn = has(peaks, 2260, 2210);
  const cc3 = has(peaks, 2260, 2100);
  const csp = has(peaks, 3340, 3250, (p) => p.shape === 'aguda' || p.shape === 'media');
  const ring = has(peaks, 1620, 1575);
  const ring2 = has(peaks, 1525, 1470);
  const no2a = has(peaks, 1560, 1490, strong);
  const no2s = has(peaks, 1385, 1315, strong);
  const cO = has(peaks, 1300, 1000, (p) => p.intensity === 'fuerte');
  const add = (h: Hypothesis) => H.push(h);

  if (acidOH.length && has(co, 1730, 1680).length)
    add({ group: 'acido', label: 'Ácido carboxílico', confidence: has(peaks, 1320, 1210, strong).length ? 'alta' : 'media', evidence: [`O–H muy ancha en ${fmt(acidOH)}`, `C=O en ${fmt(has(co, 1730, 1680))}`, ...(has(peaks, 1320, 1210, strong).length ? [`C–O en ${fmt(has(peaks, 1320, 1210, strong))}`] : [])], missing: [], against: [] });
  if (ald.length && has(co, 1740, 1685).length)
    add({ group: 'aldehido', label: 'Aldehído', confidence: has(peaks, 2830, 2800).length ? 'alta' : 'media', evidence: [`C–H de aldehído en ${fmt(ald)}`, `C=O en ${fmt(has(co, 1740, 1685))}`], missing: has(peaks, 2830, 2800).length ? [] : ['segunda banda del doblete ≈2820 cm⁻¹'], against: [] });
  const aromaticEvidence = csp2.length > 0 && ring.length > 0;
  const esterCO = has(co, 1785, 1728);
  const conjEsterCO = aromaticEvidence ? has(co, 1730, 1712) : [];
  const esterCOstr = has(peaks, 1310, 1150, (p) => p.intensity === 'fuerte');
  if ((esterCO.length || conjEsterCO.length) && esterCOstr.length && !acidOH.length && !nh.length)
    add({ group: 'ester', label: 'Éster', confidence: esterCO.length && has(peaks, 1150, 1000, strong).length ? 'alta' : 'media', evidence: [`C=O en ${fmt(esterCO.length ? esterCO : conjEsterCO)}`, `C–O en ${fmt(esterCOstr)}`], missing: has(peaks, 1150, 1000, strong).length ? [] : ['segunda banda C–O 1150–1000 cm⁻¹'], against: ohBroad.length ? ['hay una O–H ancha: podría ser un hidroxiéster o una mezcla'] : [] });
  if (has(co, 1725, 1660).length && !esterCO.length && !acidOH.length && !ald.length && !nh.length)
    add({ group: 'cetona', label: 'Cetona', confidence: 'media', evidence: [`C=O en ${fmt(has(co, 1725, 1660))}`, 'sin O–H de ácido, sin C–H de aldehído y sin N–H'], missing: [], against: esterCOstr.length ? ['hay una banda intensa en 1310–1150 cm⁻¹: en cetonas suele ser la tensión C–C(=O)–C, pero en un éster conjugado sería C–O'] : [] });
  if (has(co, 1700, 1630).length && nh.length)
    add({ group: 'amida', label: 'Amida primaria o secundaria', confidence: 'media', evidence: [`N–H en ${fmt(nh)}`, `C=O (amida I) en ${fmt(has(co, 1700, 1630))}`], missing: [], against: [] });
  if (ohBroad.length && !co.length)
    add({ group: 'alcohol-fenol', label: ring.length ? 'Fenol (o alcohol con anillo aromático)' : 'Alcohol', confidence: cO.length ? 'alta' : 'media', evidence: [`O–H ancha en ${fmt(ohBroad)}`, ...(cO.length ? [`C–O en ${fmt(cO)}`] : [])], missing: cO.length ? [] : ['banda C–O intensa 1260–1000 cm⁻¹'], against: [] });
  if (nh.length && !co.length)
    add({ group: 'amina', label: 'Amina (o N–H no carbonílico)', confidence: 'baja', evidence: [`N–H en ${fmt(nh)}`], missing: ['confirmar con flexión N–H 1650–1580 cm⁻¹ y C–N'], against: ohBroad.length ? ['una O–H ancha puede ocultar las N–H'] : [] });
  if (cn.length)
    add({ group: 'nitrilo', label: 'Nitrilo', confidence: 'media', evidence: [`banda en ${fmt(cn)}`], missing: [], against: cc3.length > cn.length ? ['un C≡C también absorbe en esta región'] : [] });
  if (csp.length && cc3.length)
    add({ group: 'alquino', label: 'Alquino terminal', confidence: 'media', evidence: [`≡C–H en ${fmt(csp)}`, `C≡C en ${fmt(cc3)}`], missing: [], against: ohBroad.length || nh.length ? ['O–H/N–H pueden confundirse con ≡C–H'] : [] });
  if (no2a.length && no2s.length)
    add({ group: 'nitro', label: 'Nitrocompuesto', confidence: 'media', evidence: [`N–O asimétrica en ${fmt(no2a)}`, `N–O simétrica en ${fmt(no2s)}`], missing: [], against: ring.length ? ['el anillo aromático también absorbe cerca de 1500 cm⁻¹'] : [] });
  if (csp2.length && ring.length && ring2.length)
    add({ group: 'aromatico', label: 'Anillo aromático', confidence: has(peaks, 900, 675, strong).length ? 'alta' : 'media', evidence: [`C–H sp² en ${fmt(csp2)}`, `C=C del anillo en ${fmt([...ring, ...ring2])}`, ...(has(peaks, 900, 675, strong).length ? [`C–H fuera del plano en ${fmt(has(peaks, 900, 675, strong))}`] : [])], missing: [], against: [] });
  else if (csp2.length && has(peaks, 1680, 1620).length)
    add({ group: 'alqueno', label: 'Alqueno', confidence: 'baja', evidence: [`C–H sp² en ${fmt(csp2)}`, `C=C en ${fmt(has(peaks, 1680, 1620))}`], missing: ['flexiones =C–H 1000–650 cm⁻¹'], against: [] });
  if (!co.length && !ohBroad.length && !nh.length && cO.length && has(peaks, 1150, 1070, (p) => p.intensity === 'fuerte').length)
    add({ group: 'eter', label: 'Éter', confidence: 'baja', evidence: [`C–O–C en ${fmt(has(peaks, 1150, 1070, (p) => p.intensity === 'fuerte'))}`, 'sin O–H ni C=O'], missing: [], against: ['muchas bandas de la huella dactilar caen en esta región'] });
  if (csp3.length && !co.length && !ohBroad.length && !nh.length && !csp2.length && !cO.length && !cn.length)
    add({ group: 'alcano', label: 'Hidrocarburo saturado', confidence: 'media', evidence: [`sólo C–H sp³ en ${fmt(csp3)}`, 'sin grupos polares evidentes'], missing: [], against: [] });
  return H;
}
