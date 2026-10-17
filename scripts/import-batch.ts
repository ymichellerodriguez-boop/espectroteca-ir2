/**
 * Importador por lotes de archivos JCAMP-DX obtenidos legítimamente (Node.js).
 *
 *   npm run jcamp:import -- --input <carpeta> --manifest <manifest.json> [--force] [--test]
 *
 *  --manifest  relaciona cada archivo con su compuesto y su procedencia (ver docs/manifest.example.json).
 *  --test      modo de prueba: escribe en data/.import-test/ y NO modifica la biblioteca real.
 *  --force     permite sobrescribir importaciones existentes (por defecto se avisa y se omite).
 *
 * Después de importar, ejecute `npm run library:build` para regenerar public/data/.
 */
import { basename, join } from 'node:path';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { convertJcampText } from '../src/lib/jcamp/convert';
import { ROOT, arg, ensureDir, flag, listFiles, readText, round, sha256, slug, today, writeJson, writeJsonSafe } from './lib/util';

interface ManifestFile {
  file: string;
  compoundId?: string;
  name?: string;
  nameEs?: string;
  synonyms?: string[];
  formula?: string;
  primaryCategory?: string;
  categories?: string[];
  functionalGroups?: string[];
  flags?: string[];
  sourceIdentifier?: string;
  url?: string;
  acquisitionDate?: string;
  technique?: string;
  redistributable?: boolean;
  notes?: string;
}
interface Manifest {
  source: { name: string; url?: string; terms?: string };
  files: ManifestFile[];
}

const input = arg('input');
const manifestPath = arg('manifest');
const test = flag('test');
const force = flag('force');
if (!input || !manifestPath) {
  console.error('Uso: npm run jcamp:import -- --input <carpeta> --manifest <manifest.json> [--force] [--test]');
  process.exit(2);
}
const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const outDir = test ? join(ROOT, 'data', '.import-test') : join(ROOT, 'data', 'imported');
const publicJcampDir = test ? join(outDir, 'public-jcamp') : join(ROOT, 'public', 'spectra', 'jcamp');
if (test && existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
ensureDir(outDir);

const REQUIRED: (keyof ManifestFile)[] = ['compoundId', 'name', 'formula', 'primaryCategory', 'categories', 'functionalGroups'];
const byFile = new Map(manifest.files.map((m) => [m.file, m]));
const files = listFiles(input);
const processed: Record<string, unknown>[] = [];
const rejected: Record<string, unknown>[] = [];

for (const path of files) {
  const fname = basename(path);
  const m = byFile.get(fname);
  const text = readText(path);
  const rep = convertJcampText(text, fname);
  const reasons: string[] = [];
  if (!rep.ok) reasons.push(...(rep.errors.length ? rep.errors : ['no se obtuvo ningún espectro válido']));
  if (!m) reasons.push('el archivo no figura en el manifiesto (no se puede relacionar con un compuesto)');
  else {
    const miss = REQUIRED.filter((k) => m[k] === undefined || (Array.isArray(m[k]) && !(m[k] as unknown[]).length));
    if (miss.length) reasons.push(`faltan metadatos en el manifiesto: ${miss.join(', ')}`);
  }
  const sp = rep.spectra.find((s) => s.validation.ok);
  if (sp) {
    const dt = (sp.meta.dataType ?? '').toUpperCase();
    const isIR = dt.includes('INFRARED') || (sp.spectrum.xUnits === 'cm-1' && sp.validation.xMin >= 200 && sp.validation.xMax <= 15000);
    if (!isIR) reasons.push(`el espectro no parece infrarrojo (DATA TYPE=${sp.meta.dataType ?? '¿?'}; X ${sp.validation.xMin.toFixed(0)}–${sp.validation.xMax.toFixed(0)} ${sp.spectrum.xUnits})`);
  }
  if (reasons.length || !sp || !m) {
    rejected.push({ file: fname, reasons, warnings: rep.warnings });
    console.log(`RECHAZADO ${fname}: ${reasons.join('; ')}`);
    continue;
  }
  const id = slug(m.compoundId!);
  const recId = `${id}--${slug(fname)}`;
  const target = join(outDir, `${recId}.json`);
  let originalFile: string | undefined;
  if (m.redistributable) {
    ensureDir(publicJcampDir);
    const dest = join(publicJcampDir, `${recId}.jdx`);
    if (!existsSync(dest) || force) copyFileSync(path, dest);
    originalFile = `spectra/jcamp/${recId}.jdx`;
  }
  const record = {
    recordId: recId,
    compoundId: id,
    name: m.name,
    nameEs: m.nameEs ?? m.name,
    synonyms: m.synonyms ?? [],
    formula: m.formula,
    primaryCategory: m.primaryCategory,
    categories: m.categories,
    functionalGroups: m.functionalGroups,
    flags: m.flags ?? [],
    technique: m.technique ?? sp.meta.state ?? sp.meta.samplingProcedure,
    source: { name: manifest.source.name, url: m.url ?? manifest.source.url, terms: manifest.source.terms },
    sourceIdentifier: m.sourceIdentifier,
    acquisitionDate: m.acquisitionDate ?? today(),
    importedAt: new Date().toISOString(),
    originalFileName: fname,
    originalFileSha256: sha256(text),
    originalFile,
    redistributable: Boolean(m.redistributable),
    notes: m.notes,
    jcamp: { title: sp.title, encodings: sp.encodings, meta: { ...sp.meta, ldrs: undefined }, checks: sp.checks, operations: sp.operations, validation: sp.validation, warnings: sp.warnings },
    spectrum: {
      xUnits: sp.spectrum.xUnits,
      yUnits: sp.spectrum.yUnits,
      yLabel: sp.spectrum.yLabel,
      signal: sp.spectrum.signal,
      yScale: sp.spectrum.yScale,
      x: sp.spectrum.x.map((v) => round(v, 3)),
      y: sp.spectrum.y.map((v) => (Number.isFinite(v) ? Number(v.toPrecision(6)) : null)),
    },
    peakTable: sp.peakTable,
  };
  const written = writeJsonSafe(target, record, force);
  if (!written) {
    rejected.push({ file: fname, reasons: [`ya existe ${basename(target)}; use --force para sobrescribir`] });
    console.log(`OMITIDO  ${fname}: ya importado (use --force)`);
    continue;
  }
  processed.push({ file: fname, recordId: recId, compoundId: id, points: sp.validation.nPoints, encodings: sp.encodings, signal: sp.spectrum.signal, warnings: [...rep.warnings, ...sp.warnings] });
  console.log(`IMPORTADO ${fname} → ${recId} (${sp.validation.nPoints} puntos, ${sp.encodings.join('+')})`);
}

const log = { mode: test ? 'prueba' : 'real', generatedAt: new Date().toISOString(), input, manifest: manifestPath, processed, rejected };
writeJson(join(outDir, test ? 'import-log.json' : `import-log-${today()}.json`), log, true);
const md = [
  `# Importación por lotes (${test ? 'MODO DE PRUEBA: la biblioteca no se modificó' : 'biblioteca real'})`,
  '',
  `Procesados: ${processed.length} · Rechazados: ${rejected.length}`,
  '',
  '## Procesados',
  ...processed.map((p) => `- ${p.file} → \`${p.recordId}\` (${p.points} puntos, ${(p.encodings as string[]).join('+')})`),
  '',
  '## Rechazados',
  ...rejected.map((r) => `- ${r.file}: ${(r.reasons as string[]).join('; ')}`),
];
writeFileSync(join(outDir, test ? 'import-report.md' : `import-report-${today()}.md`), md.join('\n') + '\n');
console.log(`\nProcesados: ${processed.length} · Rechazados: ${rejected.length} · Salida: ${outDir}`);
if (!test && processed.length) console.log('Siguiente paso: npm run library:build');
