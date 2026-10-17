/** Tipos compartidos entre la aplicación y los scripts de Node.js. */

export type SignalKind = 'transmittance' | 'absorbance' | 'other';

export interface SpectrumData {
  x: number[];
  /** NaN = hueco (p. ej. ventana del disolvente recortada) */
  y: number[];
  xUnits: string;
  yUnits: string;
  yLabel: string;
  signal: SignalKind;
  yScale: 'percent' | 'fraction' | 'arbitrary';
}

export type VerificationStatus =
  | 'verificado'
  | 'requiere-revision'
  | 'discrepancia-nombre'
  | 'pendiente';

export type DataOrigin = 'tabla-sdbs-imagen' | 'digitalizado-imagen' | 'jcamp-dx' | 'ninguno';

export interface SourceRef {
  name: string;
  url?: string;
  identifier?: string;
  detail?: string;
  terms?: string;
}

export interface PeakTableEntry {
  wn: number;
  T: number;
  /** verificado: coincide con un mínimo local de la curva digitalizada; coherente: la curva pasa por ese nivel; dudoso: no se confirma; sin-curva: hueco */
  status: 'verificado' | 'coherente' | 'dudoso' | 'sin-curva';
  ambiguous: boolean;
  alternatives?: string[];
  ocrPrimary?: [number, number];
  orderWarning?: boolean;
}

export interface Assignment {
  id: string;
  observed: number;
  /** %T de la tabla o valor de la curva */
  observedY?: number;
  rangeMin: number;
  rangeMax: number;
  bond: string;
  group: string;
  vibration: string;
  intensity?: string;
  shape?: string;
  explanation: string;
  support: string[];
  confidence: 'alta' | 'media' | 'baja';
  source: string;
  /** detectado (matemático) → relevante → propuesta → confirmada (manual) */
  level: 'propuesta' | 'confirmada';
  refId: string;
}

export interface CompoundIndexEntry {
  id: string;
  name: string;
  nameEs: string;
  synonyms: string[];
  formula: string;
  primaryCategory: string;
  categories: string[];
  functionalGroups: string[];
  bonds: string[];
  spectrumType: string;
  technique?: string;
  source: SourceRef;
  sourceIdentifier?: string;
  verificationStatus: VerificationStatus;
  hasNumeric: boolean;
  dataOrigin: DataOrigin[];
  originalImage?: string;
  keyBands: number[];
  peakWavenumbers: number[];
  /** tipos de vibración de las asignaciones propuestas (búsqueda) */
  vibrations: string[];
  /** miniatura: señal remuestreada en 120 puntos de 4000 a 400 cm⁻¹ (0–100, null = hueco) */
  thumb?: (number | null)[];
  docOrder?: number;
}

export interface SpectrumRecord extends CompoundIndexEntry {
  xUnits: string;
  yUnits: string;
  /** curva digitalizada o JCAMP: [x[], y[]] */
  data?: { x: number[]; y: (number | null)[]; origin: DataOrigin; note: string };
  peakTable?: PeakTableEntry[];
  originalFile?: string;
  acquisitionDate: string;
  assignments: Assignment[];
  notes: string[];
  limitations: string[];
  distinctive: string[];
  howToRead: string[];
  provenance: Record<string, unknown>;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  keyBands: string;
  required: boolean;
  target: number;
  count: number;
  pendingNames: string[];
}
