import { useState } from 'react';
import type { Assignment } from '../lib/types';
import { REFERENCE_BANDS } from '../lib/bands';

export interface EditableAssignment extends Assignment {
  edited?: boolean;
  removed?: boolean;
  userNote?: string;
}

interface Props {
  items: EditableAssignment[];
  onChange: (items: EditableAssignment[]) => void;
  /** el usuario puede añadir asignaciones nuevas en un número de onda */
  allowAdd?: boolean;
  signalLabel?: string;
}

/**
 * Lista editable de asignaciones. Distingue «propuesta» (automática) de «confirmada» (revisada por
 * el usuario). Los cambios son locales: no modifican la biblioteca publicada.
 */
export default function AssignmentEditor({ items, onChange, allowAdd = true, signalLabel = '%T' }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [newWn, setNewWn] = useState('');
  const [newRef, setNewRef] = useState('');
  const visible = items.filter((a) => !a.removed);
  const upd = (id: string, patch: Partial<EditableAssignment>) => onChange(items.map((a) => (a.id === id ? { ...a, ...patch, edited: true } : a)));

  const add = () => {
    const wn = Number(newWn);
    const ref = REFERENCE_BANDS.find((b) => b.id === newRef);
    if (!Number.isFinite(wn) || !ref) return;
    onChange([
      ...items,
      {
        id: `manual-${ref.id}-${Math.round(wn)}-${Date.now()}`,
        observed: wn,
        rangeMin: ref.lo,
        rangeMax: ref.hi,
        bond: ref.bond,
        group: ref.group,
        vibration: ref.vibration,
        explanation: ref.explanation,
        support: [],
        confidence: wn <= ref.hi && wn >= ref.lo ? 'media' : 'baja',
        source: 'Asignación añadida por el usuario',
        level: 'confirmada',
        refId: ref.id,
        edited: true,
      },
    ]);
    setNewWn('');
    setNewRef('');
  };
  const nearby = Number.isFinite(Number(newWn)) && newWn !== '' ? REFERENCE_BANDS.filter((b) => Number(newWn) <= b.hi + 15 && Number(newWn) >= b.lo - 15) : REFERENCE_BANDS;

  return (
    <div className="assign-list">
      {visible.length === 0 && <p className="muted">No hay asignaciones propuestas con suficiente evidencia.</p>}
      {visible.map((a) => (
        <article key={a.id} className={`assign ${a.level === 'confirmada' ? 'confirmed' : ''}`}>
          <header>
            <span className="assign-wn">{Math.round(a.observed)}</span>
            <div>
              <h4>{a.bond}</h4>
              <p className="small muted">{a.group}</p>
            </div>
            <span className={`small conf-${a.confidence}`} title="Confianza de la asignación">
              confianza {a.confidence}
            </span>
          </header>
          <dl className="assign-facts">
            <div>
              <dt>Intervalo de referencia</dt>
              <dd>
                {a.rangeMin}–{a.rangeMax} cm⁻¹
              </dd>
            </div>
            <div>
              <dt>Vibración</dt>
              <dd>{a.vibration}</dd>
            </div>
            {a.intensity && (
              <div>
                <dt>Intensidad</dt>
                <dd>
                  {a.intensity}
                  {a.observedY !== undefined ? ` (${Math.round(a.observedY)} ${signalLabel})` : ''}
                </dd>
              </div>
            )}
            {a.shape && (
              <div>
                <dt>Forma</dt>
                <dd>{a.shape}</dd>
              </div>
            )}
            <div>
              <dt>Estado</dt>
              <dd>{a.level === 'confirmada' ? 'confirmada por usted' : 'propuesta automática'}</dd>
            </div>
          </dl>
          <p className="assign-exp">{a.explanation}</p>
          {a.support.length > 0 && <p className="small">Otras señales que la apoyan: {a.support.join('; ')}.</p>}
          {a.userNote && <p className="small note-inline">Su nota: {a.userNote}</p>}
          <p className="small muted">Fuente del intervalo: {a.source}</p>
          {editing === a.id ? (
            <div className="assign-edit">
              <div className="field">
                <label htmlFor={`wn-${a.id}`}>Número de onda observado</label>
                <input id={`wn-${a.id}`} type="number" defaultValue={Math.round(a.observed)} onBlur={(e) => upd(a.id, { observed: Number(e.target.value) })} />
              </div>
              <div className="field">
                <label htmlFor={`n-${a.id}`}>Nota</label>
                <textarea id={`n-${a.id}`} rows={2} defaultValue={a.userNote} onBlur={(e) => upd(a.id, { userNote: e.target.value })} />
              </div>
              <button type="button" className="btn small" onClick={() => setEditing(null)}>
                Guardar cambios
              </button>
            </div>
          ) : (
            <div className="btn-row">
              {a.level !== 'confirmada' ? (
                <button type="button" className="btn small" onClick={() => upd(a.id, { level: 'confirmada' })}>
                  Confirmar
                </button>
              ) : (
                <button type="button" className="btn small quiet" onClick={() => upd(a.id, { level: 'propuesta' })}>
                  Volver a propuesta
                </button>
              )}
              <button type="button" className="btn small quiet" onClick={() => setEditing(a.id)}>
                Editar
              </button>
              <button type="button" className="btn small quiet" onClick={() => upd(a.id, { removed: true })}>
                Descartar
              </button>
            </div>
          )}
        </article>
      ))}
      {items.some((a) => a.removed) && (
        <button type="button" className="btn small secondary" onClick={() => onChange(items.map((a) => ({ ...a, removed: false })))}>
          Recuperar {items.filter((a) => a.removed).length} descartadas
        </button>
      )}
      {allowAdd && (
        <div className="panel soft add-assign">
          <h4>Añadir una asignación</h4>
          <div className="row">
            <input aria-label="Número de onda" type="number" placeholder="cm⁻¹" value={newWn} onChange={(e) => setNewWn(e.target.value)} style={{ maxWidth: 120 }} />
            <select aria-label="Banda de referencia" value={newRef} onChange={(e) => setNewRef(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
              <option value="">Elija la banda de referencia…</option>
              {nearby.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bond} — {b.group} ({b.lo}–{b.hi})
                </option>
              ))}
            </select>
            <button type="button" className="btn small" onClick={add} disabled={!newWn || !newRef}>
              Añadir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
