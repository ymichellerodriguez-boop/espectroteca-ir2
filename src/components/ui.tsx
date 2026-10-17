import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { VerificationStatus } from '../lib/types';

/** Fórmula con subíndices: C2H5ClO → C₂H₅ClO (sólo presentación). */
export function Formula({ f }: { f: string }) {
  const parts = f.split(/(\d+)/);
  return (
    <span className="formula">
      {parts.map((p, i) => (/^\d+$/.test(p) ? <sub key={i}>{p}</sub> : <Fragment key={i}>{p}</Fragment>))}
    </span>
  );
}

const STATUS: Record<VerificationStatus, { cls: string; label: string; title: string }> = {
  verificado: { cls: 'ok', label: 'Verificado', title: 'El nombre impreso en la imagen coincide con el del documento y los ejes se calibraron correctamente.' },
  'discrepancia-nombre': { cls: 'warn', label: 'Nombre corregido', title: 'El nombre del Word no coincide con el impreso en la imagen; se usa el de la imagen.' },
  'requiere-revision': { cls: 'bad', label: 'Requiere revisión', title: 'No se ha podido verificar que la imagen corresponda al compuesto.' },
  pendiente: { cls: 'neutral', label: 'Pendiente', title: 'Sin espectro incorporado.' },
};
export function StatusBadge({ s }: { s: VerificationStatus }) {
  const v = STATUS[s];
  return (
    <span className={`status ${v.cls}`} title={v.title}>
      {v.label}
    </span>
  );
}
export const statusLabel = (s: VerificationStatus) => STATUS[s].label;

/** Miniatura del espectro (información real, remuestreada). 4000 cm⁻¹ a la izquierda. */
export function Sparkline({ values, className }: { values?: (number | null)[]; className?: string }) {
  if (!values?.length) return null;
  const W = 240;
  const H = 54;
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    const x = (i / (values.length - 1)) * W;
    const y = 3 + (1 - v / 100) * (H - 6);
    d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    pen = true;
  });
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function CategoryChip({ id, name }: { id: string; name: string }) {
  return (
    <Link className="chip" to={`/biblioteca?categoria=${id}`}>
      {name}
    </Link>
  );
}

export function Loading({ what = 'datos' }: { what?: string }) {
  return (
    <div className="empty" role="status">
      Cargando {what}…
    </div>
  );
}

export function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="alert error" role="alert">
      {msg}
    </div>
  );
}

export const fmtWn = (v: number) => `${Math.round(v)} cm⁻¹`;
