/**
 * Construye la biblioteca estática publicada en public/data/ a partir de:
 *   - data/extracted/docx-extraction.json  (salida de scripts/docx/extract_docx.py)
 *   - data/imported/*.json                 (salida de scripts/import-batch.ts)
 *
 *   npm run library:build
 *
 * Genera: public/data/library.json (índice), public/data/spectra/<id>.json (fichas),
 * public/data/categories.json, public/data/inventory.json y data/reports/build-report.md.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assignKnownStructure, type ObservedPeak } from '../src/lib/assign';
import { CATEGORY_DEFS, GROUP_LABELS, TARGET_PER_CATEGORY, bondsFor } from '../src/lib/categories';
import { detectPeaks } from '../src/lib/peaks';
import type { Assignment, CategoryInfo, CompoundIndexEntry, PeakTableEntry, SpectrumRecord } from '../src/lib/types';
import { ROOT, ensureDir, round, writeJson } from './lib/util';

const BUILD_DATE = process.env.LIBRARY_DATE ?? new Date().toISOString().slice(0, 10);
const extraction = JSON.parse(readFileSync(join(ROOT, 'data/extracted/docx-extraction.json'), 'utf8'));
const pubData = join(ROOT, 'public/data');
const specDir = join(pubData, 'spectra');
if (existsSync(specDir)) rmSync(specDir, { recursive: true });
ensureDir(specDir);

const TECH_ES: Record<string, string> = {
  'LIQUID FILM': 'Película líquida (líquido puro)',
  'CCL4 SOLUTION': 'Disolución en CCl₄',
  'KBR DISC': 'Pastilla de KBr (sólido)',
  'NUJOL MULL': 'Suspensión en Nujol (sólido)',
};
const SDBS_TERMS =
  'SDBS es de acceso gratuito para uso no comercial; prohíbe la descarga masiva o automatizada y pide citar «SDBS, National Institute of Advanced Industrial Science and Technology (AIST), fecha de acceso».';

function techniqueNotes(tech: string): string[] {
  const t = tech.toUpperCase();
  const n: string[] = [];
  if (t.includes('NUJOL')) n.push('Suspensión en Nujol: las bandas ≈2950–2850, ≈1460 y ≈1377 cm⁻¹ contienen la absorción del aceite mineral; no deben atribuirse sólo a la muestra.');
  if (t.includes('CCL4')) n.push('Disolución en CCl₄: el disolvente absorbe con fuerza en algunas regiones (p. ej. ≈1600–1500 y por debajo de ≈850 cm⁻¹); SDBS recorta esas zonas, que aparecen como huecos en la curva.');
  if (t.includes('KBR')) n.push('Pastilla de KBr: el agua absorbida por el KBr puede aportar señal cerca de 3400 y 1640 cm⁻¹. En el sólido los puentes de hidrógeno desplazan y ensanchan las bandas O–H y N–H.');
  if (t.includes('LIQUID FILM')) n.push('Película de líquido puro: las moléculas interaccionan entre sí (puentes de hidrógeno), por lo que las bandas O–H/N–H aparecen asociadas y anchas.');
  return n;
}

const CATEGORY_TIPS: Record<string, string> = {
  alcoholes: 'Busque primero la O–H ancha sobre 3300 cm⁻¹ y confírmela con una C–O intensa entre 1260 y 1000 cm⁻¹; la ausencia de C=O descarta ácidos y ésteres.',
  fenoles: 'La O–H se combina con señales del anillo (C–H > 3000 cm⁻¹, ≈1600/1500 cm⁻¹) y una C–O a mayor número de onda que en los alcoholes (≈1260–1180 cm⁻¹).',
  'acidos-carboxilicos': 'La combinación O–H extremadamente ancha (3300–2500 cm⁻¹) + C=O ≈1710 cm⁻¹ es casi inequívoca de un ácido carboxílico.',
  cetonas: 'El C=O intenso cerca de 1715 cm⁻¹ sin O–H, sin C–H de aldehído y sin C–O intensa sugiere cetona; la posición exacta informa sobre conjugación y tamaño de anillo.',
  esteres: 'Patrón de «tres bandas»: C=O ≈1740 cm⁻¹ y dos C–O fuertes entre 1300 y 1000 cm⁻¹.',
  amidas: 'El C=O aparece a menor número de onda que en cetonas (≈1690–1630 cm⁻¹); el número de bandas N–H distingue amidas primarias (dos), secundarias (una) y terciarias (ninguna).',
  aromaticos: 'C–H por encima de 3000 cm⁻¹, bandas del anillo ≈1600 y ≈1500 cm⁻¹ y flexiones fuera del plano intensas por debajo de 900 cm⁻¹.',
  eteres: 'Ni O–H ni C=O, pero una C–O–C muy intensa (≈1120 cm⁻¹ en éteres alifáticos).',
  alcanos: 'Sólo C–H sp³ (<3000 cm⁻¹) y sus flexiones (≈1465 y ≈1375 cm⁻¹); la ausencia de otras bandas es la principal evidencia.',
};

interface DocRecord {
  docIndex: number;
  section: string;
  docName: string | null;
  id?: string;
  meta?: { name: string; nameEs: string; synonyms: string[]; formula: string; primaryCategory: string; categories: string[]; functionalGroups: string[]; flags: string[] };
  header: { imageName?: string; sdbsNo?: string | null; irNida?: string | null; technique?: string | null };
  image: string;
  imageSha256: string;
  originalImage?: string;
  nameCheck: string;
  nameCheckDetail?: string;
  frame?: Record<string, number>;
  tickCheck?: Record<string, boolean>;
  points?: [number, number | null][];
  peaks?: (PeakTableEntry & { check?: unknown })[];
  stats?: Record<string, number>;
  orderBreaks?: number;
}

const records: DocRecord[] = extraction.records;
const index: CompoundIndexEntry[] = [];
const report: string[] = [];
const formatSub = (f: string) => f;

function curveFromPoints(points: [number, number | null][]) {
  // los puntos están de 4000 a 400 cm⁻¹; se guardan en orden creciente y sin X repetidas
  const pts = points.slice().reverse();
  const x: number[] = [];
  const y: (number | null)[] = [];
  for (const [wn, t] of pts) {
    const xv = round(wn, 1);
    if (x.length && xv <= x[x.length - 1]) continue;
    x.push(xv);
    y.push(t === null ? null : round(t, 2));
  }
  return { x, y };
}

function thumbnail(x: number[], y: (number | null)[], signal: string): (number | null)[] {
  const out: (number | null)[] = [];
  const finite = y.filter((v): v is number => v !== null && Number.isFinite(v));
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  let j = 0;
  for (let k = 0; k < 120; k++) {
    const wn = 400 + (k * 3600) / 119; // creciente; se invierte al final
    while (j < x.length - 1 && x[j + 1] <= wn) j++;
    const v = x[j] <= wn + 40 && x[j] >= wn - 40 ? y[j] : null;
    if (v === null || !Number.isFinite(v)) { out.push(null); continue; }
    const norm = signal === 'transmittance' && hi <= 101 && lo >= -1 ? v : ((v - lo) / (hi - lo || 1)) * 100;
    out.push(Math.round(signal === 'transmittance' ? norm : 100 - norm));
  }
  return out.reverse();
}

function nearestWidth(det: ReturnType<typeof detectPeaks>, wn: number): number | null {
  let best: { d: number; w: number | null } | null = null;
  for (const p of det) {
    const d = Math.abs(p.x - wn);
    const tol = wn >= 2000 ? 20 : 10;
    if (d <= tol && (!best || d < best.d)) best = { d, w: p.widthCm };
  }
  return best ? best.w : null;
}

function howToRead(rec: { nameEs: string; primaryCategory: string; technique: string }, A: Assignment[], missing: { band: { bond: string; lo: number; hi: number }; note: string }[]): string[] {
  const steps: string[] = [];
  const above = A.filter((a) => a.observed >= 2500);
  const mid = A.filter((a) => a.observed < 2500 && a.observed >= 1500);
  const low = A.filter((a) => a.observed < 1500);
  const list = (xs: Assignment[]) => xs.map((a) => `${a.bond} ≈${Math.round(a.observed)} cm⁻¹`).join('; ');
  steps.push('Compruebe los ejes: número de onda (cm⁻¹) decreciente de izquierda a derecha y transmitancia en %; las absorciones son descensos de la curva.');
  steps.push(above.length ? `Región de 4000 a 2500 cm⁻¹ (enlaces con H): ${list(above)}. Fíjese en si hay bandas por encima de 3000 cm⁻¹ (C–H sp²/O–H/N–H) o sólo por debajo (C–H sp³).` : 'Región de 4000 a 2500 cm⁻¹: no hay bandas asignadas con suficiente evidencia.');
  steps.push(mid.length ? `Región de 2500 a 1500 cm⁻¹ (triples y dobles enlaces): ${list(mid)}.` : 'Región de 2500 a 1500 cm⁻¹: no aparece ninguna banda C=O, C≡N o C≡C con suficiente evidencia, lo que también es informativo.');
  steps.push(low.length ? `Región por debajo de 1500 cm⁻¹ (huella dactilar): ${list(low)}. Estas asignaciones son orientativas: en esta región se acoplan muchas vibraciones.` : 'Región por debajo de 1500 cm⁻¹ (huella dactilar): úsela para comparar con espectros de referencia más que para asignar bandas aisladas.');
  if (missing.length) steps.push(`Ausencias significativas: ${missing.map((m) => `${m.band.bond} (${m.band.lo}–${m.band.hi} cm⁻¹) — ${m.note}`).join(' ')}`);
  if (CATEGORY_TIPS[rec.primaryCategory]) steps.push(`Conclusión para ${rec.nameEs}: ${CATEGORY_TIPS[rec.primaryCategory]}`);
  return steps;
}

for (const r of records) {
  if (!r.id || !r.meta || !r.points) {
    report.push(`- Entrada ${r.docIndex} «${r.docName}»: no incorporada (${r.nameCheck}). ${r.nameCheckDetail ?? ''}`);
    continue;
  }
  const m = r.meta;
  const tech = r.header.technique ?? '';
  const curve = curveFromPoints(r.points);
  const det = detectPeaks(curve.x, curve.y, 'transmittance', { minProminence: 0.02, minDistance: 6 });
  const table: PeakTableEntry[] = (r.peaks ?? []).map((p) => ({
    wn: p.wn,
    T: p.T,
    status: p.status,
    ambiguous: p.ambiguous,
    alternatives: p.ambiguous ? p.alternatives : undefined,
    ocrPrimary: p.ocrPrimary,
    orderWarning: p.orderWarning,
  }));
  let observed: ObservedPeak[];
  if (table.length) {
    observed = table.map((p) => ({ wn: p.wn, y: p.T, widthCm: nearestWidth(det, p.wn), reliable: p.status === 'verificado' || p.status === 'coherente', origin: 'tabla' as const }));
    // mínimos claros de la curva que la tabla de SDBS no lista (p. ej. bandas muy anchas)
    for (const d of det) {
      if (d.prominenceRel < 0.08) continue;
      if (observed.some((o) => Math.abs(o.wn - d.x) <= (d.x >= 2000 ? 40 : 20))) continue;
      observed.push({ wn: round(d.x, 0), y: round(d.y, 1), widthCm: d.widthCm, reliable: true, origin: 'curva' });
    }
  } else {
    observed = det.map((p) => ({ wn: round(p.x, 0), y: round(p.y, 1), widthCm: p.widthCm, reliable: false, origin: 'curva' as const }));
  }
  const ctx = { groups: m.functionalGroups, flags: m.flags, technique: tech };
  const { assignments, missing } = assignKnownStructure(observed, ctx, 'transmittance');
  const verificationStatus = r.nameCheck === 'coincide' ? 'verificado' : r.nameCheck === 'discrepancia-nombre' ? 'discrepancia-nombre' : 'requiere-revision';
  const sdbsId = r.header.sdbsNo ? `SDBS No. ${r.header.sdbsNo}` : undefined;
  const irId = r.header.irNida ? `IR-NIDA-${r.header.irNida}` : undefined;
  const nStat = r.stats ?? {};
  const notes: string[] = [];
  if (r.nameCheckDetail) notes.push(r.nameCheckDetail);
  notes.push(`Nombre en el Word: «${r.docName}» (sección «${r.section}»). Nombre impreso en la imagen: «${r.header.imageName ?? 'no impreso'}».`);
  const limitations = [
    'La curva interactiva se obtuvo digitalizando la imagen original (≈1 punto por píxel); su resolución es de ≈7–8 cm⁻¹ por encima de 2000 cm⁻¹ y ≈4 cm⁻¹ por debajo, y la transmitancia tiene una incertidumbre de ≈1 %T. No sustituye a un archivo numérico original.',
    table.length
      ? `Los números de onda de la tabla son los impresos por SDBS, leídos por OCR: ${nStat.verificado ?? 0} confirmados por un mínimo de la curva, ${nStat.coherente ?? 0} coherentes con ella y ${nStat.dudoso ?? 0} dudosos (marcados en la tabla).`
      : 'La imagen no incluye tabla de picos: los picos mostrados se detectaron matemáticamente sobre la curva digitalizada.',
    ...techniqueNotes(tech),
    'Las asignaciones son propuestas basadas en la estructura conocida y en intervalos orientativos; no constituyen una identificación independiente del compuesto.',
  ];
  if (verificationStatus === 'requiere-revision') limitations.unshift('No se ha podido verificar que la imagen corresponda a este compuesto: la impresión no muestra nombre ni número SDBS.');
  const distinctive: string[] = [];
  const strongDiag = assignments.filter((a) => a.confidence === 'alta');
  if (strongDiag.length) distinctive.push(`Bandas diagnósticas: ${strongDiag.map((a) => `${a.bond} ${Math.round(a.observed)} cm⁻¹`).join(', ')}.`);
  const catTip = CATEGORY_TIPS[m.primaryCategory];
  if (catTip) distinctive.push(catTip);
  if (m.flags.includes('carbonilo-conjugado')) distinctive.push('La conjugación del carbonilo baja su número de onda respecto al análogo saturado.');
  if (m.flags.includes('anillo-5')) distinctive.push('La tensión del anillo de cinco miembros sube el C=O por encima de 1740 cm⁻¹.');
  if (m.flags.includes('beta-dicetona')) distinctive.push('El equilibrio ceto-enólico da dos sistemas de bandas: C=O cetónico ≈1725–1705 cm⁻¹ y enol quelado ≈1640–1580 cm⁻¹.');
  if (m.flags.includes('cadena-larga')) distinctive.push('Cadena con cuatro o más CH₂ consecutivos: puede verse un balanceo ≈720 cm⁻¹.');

  const keyBands = [...new Set(strongDiag.map((a) => Math.round(a.observed)))].sort((a, b) => b - a);
  const entry: CompoundIndexEntry = {
    id: r.id,
    name: m.name,
    nameEs: m.nameEs,
    synonyms: [...new Set([...m.synonyms, ...(r.docName && r.nameCheck === 'coincide' ? [r.docName] : [])])].filter((s) => s.toLowerCase() !== m.name.toLowerCase()),
    formula: formatSub(m.formula),
    primaryCategory: m.primaryCategory,
    categories: m.categories,
    functionalGroups: m.functionalGroups,
    bonds: bondsFor(m.functionalGroups, m.flags),
    spectrumType: 'IR (transmitancia)',
    technique: TECH_ES[tech] ?? (tech || 'No indicada en la imagen'),
    source: { name: 'SDBS (AIST, Japón)', url: 'https://sdbs.db.aist.go.jp/', identifier: [sdbsId, irId].filter(Boolean).join(' · ') || undefined, detail: 'Impresión del espectro incluida en ESPECTROS.docx', terms: SDBS_TERMS },
    sourceIdentifier: [sdbsId, irId].filter(Boolean).join(' · ') || undefined,
    verificationStatus,
    hasNumeric: true,
    dataOrigin: table.length ? ['tabla-sdbs-imagen', 'digitalizado-imagen'] : ['digitalizado-imagen'],
    originalImage: r.originalImage,
    keyBands,
    peakWavenumbers: table.length ? table.map((p) => p.wn) : observed.map((p) => p.wn),
    vibrations: [...new Set(assignments.map((a) => a.vibration))],
    thumb: thumbnail(curve.x, curve.y, 'transmittance'),
    docOrder: r.docIndex,
  };
  index.push(entry);
  const rec: SpectrumRecord = {
    ...entry,
    xUnits: 'cm-1',
    yUnits: '%T',
    data: { x: curve.x, y: curve.y, origin: 'digitalizado-imagen', note: 'Curva digitalizada de la imagen SDBS; null = hueco (región recortada por el disolvente o sin trazo).' },
    peakTable: table.length ? table : undefined,
    acquisitionDate: BUILD_DATE,
    assignments,
    notes,
    limitations,
    distinctive,
    howToRead: howToRead({ nameEs: m.nameEs, primaryCategory: m.primaryCategory, technique: tech }, assignments, missing),
    provenance: {
      document: extraction.source,
      docEntry: r.docIndex,
      docSection: r.section,
      docName: r.docName,
      imageInDocx: r.image,
      imageSha256: r.imageSha256,
      imagePrintedName: r.header.imageName,
      techniquePrinted: tech,
      nameCheck: r.nameCheck,
      axisCalibration: { frame: r.frame, ticksFound: r.tickCheck, model: extraction.method.axisModel },
      peakValidation: extraction.method.peakValidation,
      peakStats: nStat,
      detectedPeaksOnCurve: det.map((p) => ({ x: round(p.x, 1), y: round(p.y, 1), widthCm: p.widthCm === null ? null : round(p.widthCm, 0), prominence: round(p.prominence, 1) })),
      missingExpected: missing.map((x) => ({ bond: x.band.bond, range: [x.band.lo, x.band.hi], group: GROUP_LABELS[x.group] ?? x.group, note: x.note })),
      acquisitionNote: 'Fecha de incorporación a la biblioteca; la fecha en que se obtuvo la impresión de SDBS no consta en el Word.',
    },
  };
  writeJson(join(specDir, `${r.id}.json`), rec);
}

// ---------------- importaciones JCAMP-DX ----------------
const impDir = join(ROOT, 'data/imported');
let imported = 0;
if (existsSync(impDir)) {
  for (const f of readdirSync(impDir).filter((f) => f.endsWith('.json') && !f.startsWith('import-log'))) {
    const im = JSON.parse(readFileSync(join(impDir, f), 'utf8'));
    const existing = index.find((e) => e.id === im.compoundId);
    const det = detectPeaks(im.spectrum.x, im.spectrum.y, im.spectrum.signal, { minProminence: 0.02, smoothing: 0 });
    const observed = det.map((p) => ({ wn: round(p.x, 0), y: p.y, widthCm: p.widthCm, reliable: true }));
    const { assignments, missing } = assignKnownStructure(observed, { groups: im.functionalGroups, flags: im.flags, technique: im.technique ?? '' }, im.spectrum.signal);
    const id = existing ? `${im.compoundId}--jcamp` : im.compoundId;
    const entry: CompoundIndexEntry = {
      id,
      name: im.name,
      nameEs: im.nameEs,
      synonyms: im.synonyms,
      formula: im.formula,
      primaryCategory: im.primaryCategory,
      categories: im.categories,
      functionalGroups: im.functionalGroups,
      bonds: bondsFor(im.functionalGroups, im.flags),
      spectrumType: `IR (${im.spectrum.yLabel})`,
      technique: im.technique,
      source: im.source,
      sourceIdentifier: im.sourceIdentifier,
      verificationStatus: 'verificado',
      hasNumeric: true,
      dataOrigin: ['jcamp-dx'],
      keyBands: assignments.filter((a) => a.confidence === 'alta').map((a) => Math.round(a.observed)),
      peakWavenumbers: observed.map((p) => p.wn),
      vibrations: [...new Set(assignments.map((a) => a.vibration))],
      thumb: thumbnail(im.spectrum.x, im.spectrum.y, im.spectrum.signal),
    };
    index.push(entry);
    const rec: SpectrumRecord = {
      ...entry,
      xUnits: im.spectrum.xUnits,
      yUnits: im.spectrum.yUnits,
      data: { x: im.spectrum.x, y: im.spectrum.y, origin: 'jcamp-dx', note: `Datos numéricos del archivo JCAMP-DX ${im.originalFileName}.` },
      originalFile: im.originalFile,
      acquisitionDate: im.acquisitionDate,
      assignments,
      notes: [im.notes].filter(Boolean),
      limitations: ['Asignaciones propuestas a partir de los picos detectados matemáticamente y de la estructura conocida.', ...(im.redistributable ? [] : ['El archivo original no se redistribuye por las condiciones de la fuente; obténgalo en la URL indicada.'])],
      distinctive: CATEGORY_TIPS[im.primaryCategory] ? [CATEGORY_TIPS[im.primaryCategory]] : [],
      howToRead: howToRead({ nameEs: im.nameEs, primaryCategory: im.primaryCategory, technique: im.technique ?? '' }, assignments, missing),
      provenance: { jcamp: im.jcamp, originalFileSha256: im.originalFileSha256, importedAt: im.importedAt, operations: im.jcamp.operations, signal: im.spectrum.signal, yLabel: im.spectrum.yLabel },
    };
    writeJson(join(specDir, `${id}.json`), rec);
    imported++;
  }
}

// ---------------- categorías e inventario ----------------
const pendingByCat: Record<string, string[]> = {};
for (const l of extraction.pendingLists as { category: string; names: string[] }[]) {
  const def = CATEGORY_DEFS.find((c) => c.docAliases.includes(l.category));
  if (def) (pendingByCat[def.id] ??= []).push(...l.names);
}
for (const e of extraction.textOnlyEntries as { section: string; docName: string }[]) {
  const def = CATEGORY_DEFS.find((c) => c.docAliases.includes(e.section));
  if (def) (pendingByCat[def.id] ??= []).push(e.docName);
}
for (const r of records) {
  if (r.nameCheck === 'imagen-duplicada' || r.nameCheck === 'discrepancia-nombre') {
    const def = CATEGORY_DEFS.find((c) => c.docAliases.includes(r.section));
    if (def && r.docName) (pendingByCat[def.id] ??= []).push(`${r.docName} (sin espectro válido en el Word)`);
  }
}
const categories: CategoryInfo[] = CATEGORY_DEFS.map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  keyBands: c.keyBands,
  required: c.required,
  target: TARGET_PER_CATEGORY.min,
  count: index.filter((e) => e.categories.includes(c.id)).length,
  pendingNames: [...new Set(pendingByCat[c.id] ?? [])].filter((n) => !index.some((e) => e.name.toLowerCase() === n.toLowerCase() || e.synonyms.some((s) => s.toLowerCase() === n.toLowerCase()))),
}));

index.sort((a, b) => (a.docOrder ?? 9999) - (b.docOrder ?? 9999));
writeJson(join(pubData, 'library.json'), { generatedAt: BUILD_DATE, count: index.length, compounds: index });
writeJson(join(pubData, 'categories.json'), { generatedAt: BUILD_DATE, target: TARGET_PER_CATEGORY, categories }, true);
const inventory = {
  generatedAt: BUILD_DATE,
  document: extraction.source,
  totals: {
    imagesInDocument: records.length,
    spectraInLibrary: index.length,
    fromDocx: index.filter((e) => e.dataOrigin.includes('digitalizado-imagen')).length,
    fromJcamp: imported,
    categoryAssociations: index.reduce((s, e) => s + e.categories.length, 0),
    verified: index.filter((e) => e.verificationStatus === 'verificado').length,
    needsReview: index.filter((e) => e.verificationStatus !== 'verificado').length,
  },
  issues: records.filter((r) => r.nameCheck !== 'coincide').map((r) => ({ docIndex: r.docIndex, docName: r.docName, section: r.section, nameCheck: r.nameCheck, detail: r.nameCheckDetail, includedAs: r.id ?? null })),
  categories: categories.map((c) => ({ id: c.id, name: c.name, required: c.required, count: c.count, target: c.target, missing: Math.max(0, c.target - c.count), pendingNames: c.pendingNames })),
  peakTable: records.reduce((acc: Record<string, number>, r) => { for (const [k, v] of Object.entries(r.stats ?? {})) acc[k] = (acc[k] ?? 0) + v; return acc; }, {}),
};
writeJson(join(pubData, 'inventory.json'), inventory, true);

const md = [
  `# Informe de construcción de la biblioteca (${BUILD_DATE})`,
  '',
  `- Espectros en la biblioteca: **${index.length}** (Word: ${inventory.totals.fromDocx}, JCAMP-DX importados: ${imported})`,
  `- Asociaciones espectro–categoría: **${inventory.totals.categoryAssociations}**`,
  `- Verificados: ${inventory.totals.verified} · con incidencias: ${inventory.totals.needsReview}`,
  '',
  '| Categoría | Obligatoria | Espectros | Objetivo | Faltan |',
  '|---|---|---|---|---|',
  ...categories.map((c) => `| ${c.name} | ${c.required ? 'sí' : 'no'} | ${c.count} | ${c.target} | ${Math.max(0, c.target - c.count)} |`),
  '',
  '## Entradas del Word no incorporadas o con incidencias',
  ...report,
  ...records.filter((r) => r.id && r.nameCheck !== 'coincide').map((r) => `- ${r.id}: ${r.nameCheck}. ${r.nameCheckDetail ?? ''}`),
];
ensureDir(join(ROOT, 'data/reports'));
writeFileSync(join(ROOT, 'data/reports/build-report.md'), md.join('\n') + '\n');
console.log(md.slice(0, 32).join('\n'));
