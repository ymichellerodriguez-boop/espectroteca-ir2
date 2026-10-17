import type { CompoundIndexEntry } from '../../lib/types';

export interface LibraryFilters {
  q: string;
  categories: string[];
  groups: string[];
  bonds: string[];
  wn: number | null;
  tol: number;
  vibration: string;
  source: string;
  status: string;
}

export const EMPTY_FILTERS: LibraryFilters = { q: '', categories: [], groups: [], bonds: [], wn: null, tol: 15, vibration: '', source: '', status: '' };

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/** Normaliza la notación de enlaces escrita por el usuario: "c=o", "C-H", "o-h" → forma con raya. */
const bondKey = (s: string) => norm(s).replace(/-/g, '').replace(/\s/g, '').replace(/≡/g, '#');

export function parseFilters(sp: URLSearchParams): LibraryFilters {
  const list = (k: string) => (sp.get(k) ? sp.get(k)!.split(',').filter(Boolean) : []);
  const wn = sp.get('wn');
  return {
    q: sp.get('q') ?? '',
    categories: list('categoria'),
    groups: list('grupo'),
    bonds: list('enlace'),
    wn: wn && Number.isFinite(Number(wn)) ? Number(wn) : null,
    tol: Number(sp.get('tol') ?? 15) || 15,
    vibration: sp.get('vibracion') ?? '',
    source: sp.get('fuente') ?? '',
    status: sp.get('estado') ?? '',
  };
}

export function filtersToParams(f: LibraryFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.categories.length) p.set('categoria', f.categories.join(','));
  if (f.groups.length) p.set('grupo', f.groups.join(','));
  if (f.bonds.length) p.set('enlace', f.bonds.join(','));
  if (f.wn !== null) p.set('wn', String(f.wn));
  if (f.wn !== null && f.tol !== 15) p.set('tol', String(f.tol));
  if (f.vibration) p.set('vibracion', f.vibration);
  if (f.source) p.set('fuente', f.source);
  if (f.status) p.set('estado', f.status);
  return p;
}

/** Texto libre: nombre, sinónimos, fórmula; un número busca por número de onda y «C=O» por enlace. */
function matchText(c: CompoundIndexEntry, q: string): boolean {
  const t = norm(q);
  if (!t) return true;
  if (/^\d{3,4}$/.test(t)) return c.peakWavenumbers.some((w) => Math.abs(w - Number(t)) <= 15);
  const hay = [c.name, c.nameEs, c.formula, ...c.synonyms].map(norm);
  if (hay.some((h) => h.includes(t))) return true;
  const bk = bondKey(q);
  if (c.bonds.some((b) => bondKey(b) === bk)) return true;
  return false;
}

export function applyFilters(list: CompoundIndexEntry[], f: LibraryFilters): CompoundIndexEntry[] {
  return list.filter(
    (c) =>
      matchText(c, f.q) &&
      (!f.categories.length || f.categories.every((k) => c.categories.includes(k))) &&
      (!f.groups.length || f.groups.every((g) => c.functionalGroups.includes(g))) &&
      (!f.bonds.length || f.bonds.every((b) => c.bonds.includes(b))) &&
      (f.wn === null || c.peakWavenumbers.some((w) => Math.abs(w - f.wn!) <= f.tol)) &&
      (!f.vibration || c.vibrations.some((v) => norm(v).includes(norm(f.vibration)))) &&
      (!f.source || c.source.name === f.source) &&
      (!f.status || c.verificationStatus === f.status),
  );
}

export function activeCount(f: LibraryFilters) {
  return (f.q ? 1 : 0) + f.categories.length + f.groups.length + f.bonds.length + (f.wn !== null ? 1 : 0) + (f.vibration ? 1 : 0) + (f.source ? 1 : 0) + (f.status ? 1 : 0);
}
