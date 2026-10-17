import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const JCAMP_EXT = ['.jdx', '.dx', '.jcamp', '.jcm'];

export function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return def;
}
export const flag = (name: string) => process.argv.includes(`--${name}`);

export function sha256(buf: Buffer | string) {
  return createHash('sha256').update(buf).digest('hex');
}

/** Lee como texto probando UTF-8 y, si aparecen caracteres de reemplazo, Latin-1 (habitual en JCAMP antiguos). */
export function readText(path: string): string {
  const buf = readFileSync(path);
  const utf = buf.toString('utf8');
  return utf.includes('�') ? buf.toString('latin1') : utf;
}

export function listFiles(dir: string, exts = JCAMP_EXT): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.includes(extname(f).toLowerCase())) out.push(p);
  }
  return out;
}

export function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

/** Escribe JSON. Si el archivo existe y no se pasa force, NO lo sobrescribe y devuelve false. */
export function writeJsonSafe(path: string, data: unknown, force: boolean): boolean {
  if (existsSync(path) && !force) return false;
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 0) + '\n', 'utf8');
  return true;
}

export function writeJson(path: string, data: unknown, pretty = false) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, pretty ? 2 : 0) + '\n', 'utf8');
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const today = () => new Date().toISOString().slice(0, 10);

export function round(v: number, d: number) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
