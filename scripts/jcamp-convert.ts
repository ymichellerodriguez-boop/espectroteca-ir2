/**
 * Conversor JCAMP-DX → JSON (Node.js).
 *
 *   npm run jcamp:convert -- --input <archivo|carpeta> [--out data/converted] [--force]
 *
 * Por cada archivo escribe <out>/<nombre>.json con los datos normalizados y un informe de conversión;
 * además genera <out>/conversion-report.json y <out>/conversion-report.md con los archivos procesados y
 * rechazados. Nunca sobrescribe un archivo existente sin --force.
 */
import { basename, extname, join } from 'node:path';
import { statSync, writeFileSync } from 'node:fs';
import { convertJcampText } from '../src/lib/jcamp/convert';
import { ROOT, arg, ensureDir, flag, listFiles, readText, sha256, writeJson, writeJsonSafe, round } from './lib/util';

const input = arg('input');
if (!input) {
  console.error('Uso: npm run jcamp:convert -- --input <archivo|carpeta> [--out carpeta] [--force]');
  process.exit(2);
}
const out = arg('out', join(ROOT, 'data', 'converted'))!;
const force = flag('force');
const files = statSync(input).isDirectory() ? listFiles(input) : [input];
ensureDir(out);

const summary: Record<string, unknown>[] = [];
let okCount = 0;
for (const f of files) {
  const text = readText(f);
  const rep = convertJcampText(text, basename(f));
  const name = basename(f, extname(f));
  const target = join(out, `${name}.json`);
  const payload = {
    sourceFile: basename(f),
    sha256: sha256(text),
    convertedAt: new Date().toISOString(),
    ok: rep.ok,
    errors: rep.errors,
    warnings: rep.warnings,
    spectra: rep.spectra.map((s) => ({
      title: s.title,
      dataKind: s.dataKind,
      encodings: s.encodings,
      meta: s.meta,
      checks: s.checks,
      operations: s.operations,
      validation: s.validation,
      warnings: s.warnings,
      xUnits: s.spectrum.xUnits,
      yUnits: s.spectrum.yUnits,
      yLabel: s.spectrum.yLabel,
      signal: s.spectrum.signal,
      data: { x: s.spectrum.x.map((v) => round(v, 4)), y: s.spectrum.y.map((v) => (Number.isFinite(v) ? Number(v.toPrecision(7)) : null)) },
      peakTable: s.peakTable,
    })),
    peakTablesOnly: rep.peakTablesOnly,
  };
  let written = false;
  if (rep.ok) {
    written = writeJsonSafe(target, payload, force);
    if (!written) console.warn(`AVISO: ${target} ya existe; no se sobrescribe (use --force).`);
  }
  if (rep.ok) okCount++;
  summary.push({
    file: f,
    status: rep.ok ? (written ? 'convertido' : 'omitido-existe') : 'rechazado',
    spectra: rep.spectra.length,
    points: rep.spectra.map((s) => s.validation.nPoints),
    encodings: [...new Set(rep.spectra.flatMap((s) => s.encodings))],
    errors: rep.errors,
    warnings: [...rep.warnings, ...rep.spectra.flatMap((s) => [...s.warnings, ...s.validation.issues.map((i) => `${i.level}: ${i.message}`)])],
  });
  console.log(`${rep.ok ? 'OK ' : 'ERR'} ${basename(f)}  ${rep.spectra.map((s) => `${s.validation.nPoints} pts [${s.encodings.join('+')}]`).join(', ')} ${rep.errors.join(' | ')}`);
}
writeJson(join(out, 'conversion-report.json'), { generatedAt: new Date().toISOString(), total: files.length, ok: okCount, files: summary }, true);
const md = [
  '# Informe de conversión JCAMP-DX',
  '',
  `Archivos: ${files.length} · convertidos: ${okCount} · rechazados: ${files.length - okCount}`,
  '',
  '| Archivo | Estado | Puntos | Codificación | Errores / avisos |',
  '|---|---|---|---|---|',
  ...summary.map((s) => `| ${basename(String(s.file))} | ${s.status} | ${(s.points as number[]).join(', ')} | ${(s.encodings as string[]).join('+')} | ${[...(s.errors as string[]), ...(s.warnings as string[])].join('; ').replace(/\|/g, '/')} |`),
];
writeFileSync(join(out, 'conversion-report.md'), md.join('\n') + '\n');
console.log(`\n${okCount}/${files.length} archivos convertidos. Informe: ${join(out, 'conversion-report.md')}`);
if (okCount < files.length) process.exitCode = 1;
