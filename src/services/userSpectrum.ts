import type { SpectrumData } from '../lib/types';

/** Último espectro analizado por el usuario (en memoria, para el comparador). No se envía a ningún servidor. */
export interface UserSpectrum {
  name: string;
  spectrum: SpectrumData;
  origin: string;
}
let current: UserSpectrum | null = null;
export const setUserSpectrum = (s: UserSpectrum | null) => {
  current = s;
};
export const getUserSpectrum = () => current;
