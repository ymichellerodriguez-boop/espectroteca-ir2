/** Almacenamiento local para comodidades del usuario (ediciones, progreso). Puede no estar disponible. */
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible (modo privado, vista previa): se ignora */
  }
}
export function removeLocal(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignorado */
  }
}
