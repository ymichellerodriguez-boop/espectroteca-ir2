import type { CategoryInfo, CompoundIndexEntry, SpectrumRecord } from '../lib/types';

/** Ruta a un recurso de public/ respetando la base de Vite (GitHub Pages sirve en /REPO/). */
export const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\//, '')}`;

const cache = new Map<string, Promise<unknown>>();
function getJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(asset(path)).then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar ${path} (HTTP ${r.status})`);
        return r.json();
      }).catch((e) => {
        cache.delete(path);
        throw e;
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export interface LibraryIndex {
  generatedAt: string;
  count: number;
  compounds: CompoundIndexEntry[];
}
export interface CategoriesFile {
  generatedAt: string;
  target: { min: number; max: number };
  categories: CategoryInfo[];
}
export interface InventoryFile {
  generatedAt: string;
  document: { file: string; sha256: string };
  totals: Record<string, number>;
  issues: { docIndex: number; docName: string | null; section: string; nameCheck: string; detail?: string; includedAs: string | null }[];
  categories: { id: string; name: string; required: boolean; count: number; target: number; missing: number; pendingNames: string[] }[];
  peakTable: Record<string, number>;
}

export const loadLibrary = () => getJson<LibraryIndex>('data/library.json');
export const loadCategories = () => getJson<CategoriesFile>('data/categories.json');
export const loadInventory = () => getJson<InventoryFile>('data/inventory.json');
export const loadSpectrum = (id: string) => getJson<SpectrumRecord>(`data/spectra/${encodeURIComponent(id)}.json`);
