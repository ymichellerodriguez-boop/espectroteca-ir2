/**
 * Valida la biblioteca publicada sin modificarla.
 *   npm run library:validate
 * Comprueba identificadores, archivos, ejes, categorías y que los campos obligatorios no estén vacíos.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CategoryInfo, CompoundIndexEntry, SpectrumRecord } from '../src/lib/types';
import { ROOT } from './lib/util';

const PUB = join(ROOT, 'public');
const errors: string[] = [];
const warnings: string[] = [];
const lib = JSON.parse(readFileSync(join(PUB, 'data/library.json'), 'utf8')) as { compounds: CompoundIndexEntry[] };
const cats = JSON.parse(readFileSync(join(PUB, 'data/categories.json'), 'utf8')) as { categories: CategoryInfo[] };
const ids = new Set<string>();
const catIds = new Set(cats.categories.map((c) => c.id));
for (const c of lib.compounds) {
  if (ids.has(c.id)) errors.push(`id duplicado: ${c.id}`);
  ids.add(c.id);
  for (const k of ['name', 'formula', 'primaryCategory', 'spectrumType'] as const) if (!c[k]) errors.push(`${c.id}: falta ${k}`);
  if (!c.categories.includes(c.primaryCategory)) errors.push(`${c.id}: la categoría principal no está en categories`);
  for (const k of c.categories) if (!catIds.has(k)) errors.push(`${c.id}: categoría desconocida ${k}`);
  if (c.originalImage && !existsSync(join(PUB, c.originalImage))) errors.push(`${c.id}: no existe ${c.originalImage}`);
  const f = join(PUB, 'data/spectra', `${c.id}.json`);
  if (!existsSync(f)) { errors.push(`${c.id}: falta la ficha`); continue; }
  const r = JSON.parse(readFileSync(f, 'utf8')) as SpectrumRecord;
  if (r.data) {
    const { x, y } = r.data;
    if (x.length !== y.length) errors.push(`${c.id}: longitudes X/Y distintas`);
    for (let i = 1; i < x.length; i++) if (!(x[i] > x[i - 1])) { errors.push(`${c.id}: eje X no creciente en ${i}`); break; }
    const nulls = y.filter((v) => v === null).length;
    if (nulls > y.length * 0.4) warnings.push(`${c.id}: ${nulls} huecos de ${y.length} puntos`);
  } else if (!r.originalImage) errors.push(`${c.id}: ni datos ni imagen`);
  if (!r.source?.name) errors.push(`${c.id}: sin fuente`);
  if (c.verificationStatus !== 'verificado') warnings.push(`${c.id}: estado ${c.verificationStatus}`);
}
console.log(`Compuestos: ${lib.compounds.length} · categorías: ${cats.categories.length} (con espectros: ${cats.categories.filter((c) => c.count > 0).length})`);
warnings.forEach((w) => console.log('AVISO ', w));
errors.forEach((e) => console.log('ERROR ', e));
console.log(errors.length ? `\n${errors.length} errores` : '\nBiblioteca válida.');
process.exitCode = errors.length ? 1 : 0;
