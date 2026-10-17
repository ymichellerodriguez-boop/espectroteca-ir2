import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AssignmentEditor, { type EditableAssignment } from '../components/AssignmentEditor';
import SpectrumPlot, { type PlotMarker, type PlotRegion } from '../components/SpectrumPlot';
import { CategoryChip, ErrorBox, Formula, Loading, StatusBadge } from '../components/ui';
import { CATEGORY_DEFS, GROUP_LABELS } from '../lib/categories';
import type { SpectrumRecord } from '../lib/types';
import { asset, loadSpectrum } from '../services/data';
import { downloadCsv, downloadJson, safeName } from '../services/export';
import { readLocal, removeLocal, writeLocal } from '../services/localStore';
import { useAsync } from '../services/useAsync';

const catName = (id: string) => CATEGORY_DEFS.find((c) => c.id === id)?.name ?? id;
const STATUS_TXT: Record<string, string> = { verificado: 'confirmado por la curva', coherente: 'coherente con la curva', dudoso: 'dudoso', 'sin-curva': 'en un hueco de la curva' };

export default function SpectrumDetail() {
  const { id = '' } = useParams();
  const s = useAsync(() => loadSpectrum(id), [id]);
  if (s.loading) return <Loading what="el espectro" />;
  if (s.error || !s.data)
    return (
      <div className="wrap section">
        <ErrorBox msg={`No se encontró el espectro «${id}». ${s.error ?? ''}`} />
        <p>
          <Link to="/biblioteca">Volver a la biblioteca</Link>
        </p>
      </div>
    );
  return <Detail rec={s.data} />;
}

function Detail({ rec }: { rec: SpectrumRecord }) {
  const storeKey = `asig:${rec.id}`;
  const [items, setItems] = useState<EditableAssignment[]>(() => readLocal(storeKey, rec.assignments as EditableAssignment[]));
  useEffect(() => writeLocal(storeKey, items), [items, storeKey]);
  const [labels, setLabels] = useState(true);
  const [showTable, setShowTable] = useState(true);
  const [showDetected, setShowDetected] = useState(false);
  const [showRanges, setShowRanges] = useState(false);
  const detected = (rec.provenance.detectedPeaksOnCurve ?? []) as { x: number; y: number; widthCm: number | null }[];
  const missing = (rec.provenance.missingExpected ?? []) as { bond: string; range: [number, number]; group: string; note: string }[];

  const traces = useMemo(() => (rec.data ? [{ x: rec.data.x, y: rec.data.y, name: rec.nameEs }] : []), [rec]);
  const yAt = (wn: number) => {
    if (!rec.data) return 0;
    const { x, y } = rec.data;
    let best = 0;
    for (let i = 0; i < x.length; i++) if (Math.abs(x[i] - wn) < Math.abs(x[best] - wn)) best = i;
    return y[best] ?? 0;
  };
  const markers = useMemo(() => {
    const m: PlotMarker[] = [];
    if (showTable) for (const p of rec.peakTable ?? []) m.push({ x: p.wn, y: p.T, kind: 'table', hover: `Tabla SDBS: ${p.wn} cm⁻¹, ${p.T} %T (${STATUS_TXT[p.status]})` });
    if (showDetected) for (const d of detected) m.push({ x: d.x, y: d.y, kind: 'detected', hover: `Pico detectado: ${d.x} cm⁻¹${d.widthCm ? `, anchura ≈${d.widthCm} cm⁻¹` : ''}` });
    for (const a of items.filter((x) => !x.removed))
      m.push({ x: a.observed, y: a.observedY ?? yAt(a.observed), kind: a.level === 'confirmada' ? 'confirmed' : 'assigned', label: a.level === 'confirmada' || a.confidence === 'alta' ? a.bond : undefined, hover: `${a.bond} · ${Math.round(a.observed)} cm⁻¹<br>${a.group}<br>confianza ${a.confidence}` });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, showTable, showDetected, rec]);
  const regions: PlotRegion[] = useMemo(
    () => (showRanges ? items.filter((a) => !a.removed && a.confidence === 'alta').map((a) => ({ from: a.rangeMin, to: a.rangeMax, label: a.bond })) : []),
    [items, showRanges],
  );

  const exportRows = () =>
    items
      .filter((a) => !a.removed)
      .map((a) => ({ compuesto: rec.name, numero_onda_cm1: Math.round(a.observed), enlace: a.bond, grupo: a.group, vibracion: a.vibration, intervalo: `${a.rangeMin}-${a.rangeMax}`, intensidad: a.intensity ?? '', forma: a.shape ?? '', confianza: a.confidence, estado: a.level, nota: a.userNote ?? '', fuente_intervalo: a.source }));

  return (
    <div className="wrap detail">
      <nav className="crumbs small" aria-label="Ruta">
        <Link to="/biblioteca">Biblioteca</Link> / <Link to={`/biblioteca?categoria=${rec.primaryCategory}`}>{catName(rec.primaryCategory)}</Link>
      </nav>
      <header className="detail-head">
        <div>
          <h1>{rec.nameEs}</h1>
          <p className="detail-sub">
            <Formula f={rec.formula} />
            <span>{rec.name}</span>
            {rec.synonyms.length > 0 && <span className="muted">También: {rec.synonyms.slice(0, 4).join(', ')}</span>}
          </p>
          <div className="chips">
            {rec.categories.map((c) => (
              <CategoryChip key={c} id={c} name={catName(c)} />
            ))}
            <StatusBadge s={rec.verificationStatus} />
          </div>
        </div>
        <div className="btn-row">
          <Link className="btn quiet" to={`/comparar?ids=${rec.id}`}>
            Comparar
          </Link>
          <button type="button" className="btn quiet" onClick={() => downloadCsv(`asignaciones_${safeName(rec.name)}.csv`, exportRows())}>
            Exportar CSV
          </button>
          <button type="button" className="btn quiet" onClick={() => downloadJson(`${safeName(rec.name)}.json`, { ...rec, assignments: items.filter((a) => !a.removed) })}>
            Exportar JSON
          </button>
        </div>
      </header>

      {rec.verificationStatus !== 'verificado' && (
        <div className={`alert ${rec.verificationStatus === 'requiere-revision' ? 'error' : 'warn'}`}>
          {rec.notes[0]}
        </div>
      )}

      <div className="two-col">
        <div className="stack">
          {rec.data ? (
            <SpectrumPlot
              traces={traces}
              markers={markers}
              regions={regions}
              signal="transmittance"
              yLabel="Transmitancia (%)"
              showLabels={labels}
              fileName={safeName(rec.name)}
              ariaLabel={`Espectro IR interactivo de ${rec.nameEs}`}
              toolbar={
                <>
                  <label className="check small">
                    <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Etiquetas
                  </label>
                  {rec.peakTable && (
                    <label className="check small">
                      <input type="checkbox" checked={showTable} onChange={(e) => setShowTable(e.target.checked)} /> Tabla de picos
                    </label>
                  )}
                  <label className="check small">
                    <input type="checkbox" checked={showDetected} onChange={(e) => setShowDetected(e.target.checked)} /> Picos detectados
                  </label>
                  <label className="check small">
                    <input type="checkbox" checked={showRanges} onChange={(e) => setShowRanges(e.target.checked)} /> Intervalos
                  </label>
                </>
              }
            />
          ) : (
            <p className="muted">No hay datos numéricos: se muestra la imagen original.</p>
          )}
          <div className="legend-explain small">
            <span><i className="lg t" /> Pico de la tabla de la fuente</span>
            <span><i className="lg d" /> Pico detectado matemáticamente</span>
            <span><i className="lg a" /> Asignación química propuesta</span>
            <span><i className="lg c" /> Asignación confirmada por usted</span>
          </div>
          {rec.data && <p className="small muted">{rec.data.note} La curva no reemplaza un archivo numérico original: úsela para explorar y comparar, no para medir con precisión.</p>}

          <details className="acc" open>
            <summary>Cómo leer este espectro</summary>
            <div className="acc-body">
              <ol className="howto">
                {rec.howToRead.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
            </div>
          </details>

          {rec.originalImage && (
            <details className="acc">
              <summary>Imagen original</summary>
              <div className="acc-body">
                <a href={asset(rec.originalImage)} target="_blank" rel="noreferrer">
                  <img src={asset(rec.originalImage)} alt={`Impresión original del espectro IR de ${rec.name} (SDBS)`} loading="lazy" className="orig-img" />
                </a>
                <p className="small muted">Imagen tal como aparece en ESPECTROS.docx (sin modificar). Toque para verla a tamaño completo.</p>
              </div>
            </details>
          )}

          {rec.peakTable && (
            <details className="acc">
              <summary>Tabla de picos de la fuente ({rec.peakTable.length})</summary>
              <div className="acc-body">
                <p className="small muted">
                  Valores impresos por SDBS, leídos por OCR y contrastados con la curva digitalizada. «Dudoso» indica que la lectura no pudo confirmarse; se muestran las lecturas alternativas.
                </p>
                <div className="table-wrap">
                  <table className="data cards">
                    <thead>
                      <tr>
                        <th>cm⁻¹</th>
                        <th>%T</th>
                        <th>Comprobación</th>
                        <th>Alternativas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.peakTable.map((p, i) => (
                        <tr key={i} className={p.status === 'dudoso' ? 'hl' : ''}>
                          <td data-label="cm⁻¹">{p.wn}</td>
                          <td data-label="%T">{p.T}</td>
                          <td data-label="Comprobación">{STATUS_TXT[p.status]}{p.orderWarning ? ' · fuera de orden' : ''}</td>
                          <td data-label="Alternativas">{p.alternatives?.filter((a) => a !== `${p.wn} ${p.T}`).slice(0, 3).join(' · ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          )}
        </div>

        <aside className="stack interp" aria-label="Interpretación">
          <section className="panel">
            <h2>Interpretación</h2>
            <p className="small">
              <strong>Grupo principal:</strong> {catName(rec.primaryCategory)}. <strong>Grupos presentes:</strong> {rec.functionalGroups.map((g) => GROUP_LABELS[g] ?? g).join(', ')}.
            </p>
            {rec.distinctive.map((d, i) => (
              <p key={i} className="small">
                {d}
              </p>
            ))}
            {missing.length > 0 && (
              <div className="alert info small">
                <strong>Señales esperadas no encontradas</strong>
                <ul>
                  {missing.map((m, i) => (
                    <li key={i}>
                      {m.bond} ({m.range[0]}–{m.range[1]} cm⁻¹): {m.note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section>
            <div className="row">
              <h2 style={{ margin: 0 }}>Bandas asignadas</h2>
              <span className="spacer" />
              {items.some((a) => a.edited || a.removed) && (
                <button
                  type="button"
                  className="btn small secondary"
                  onClick={() => {
                    removeLocal(storeKey);
                    setItems(rec.assignments as EditableAssignment[]);
                  }}
                >
                  Restaurar originales
                </button>
              )}
            </div>
            <p className="small muted">Puede confirmar, editar o descartar cada asignación; los cambios se guardan sólo en este navegador.</p>
            <AssignmentEditor items={items} onChange={setItems} />
          </section>
          <details className="acc">
            <summary>Limitaciones de la interpretación</summary>
            <div className="acc-body">
              <ul>
                {rec.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          </details>
          <details className="acc">
            <summary>Fuente y procedencia</summary>
            <div className="acc-body small">
              <p>
                <strong>Fuente:</strong>{' '}
                {rec.source.url ? (
                  <a href={rec.source.url} target="_blank" rel="noreferrer">
                    {rec.source.name}
                  </a>
                ) : (
                  rec.source.name
                )}
                {rec.sourceIdentifier ? ` — ${rec.sourceIdentifier}` : ''}
              </p>
              {rec.source.detail && <p>{rec.source.detail}.</p>}
              <p>
                <strong>Técnica de muestreo:</strong> {rec.technique}
              </p>
              <p>
                <strong>Tipo de datos:</strong> {rec.dataOrigin.map((d) => ({ 'tabla-sdbs-imagen': 'tabla de picos impresa', 'digitalizado-imagen': 'curva digitalizada de la imagen', 'jcamp-dx': 'archivo JCAMP-DX', ninguno: 'sólo imagen' })[d]).join(' + ')}
              </p>
              <p>
                <strong>Incorporado a la biblioteca:</strong> {rec.acquisitionDate}
              </p>
              {rec.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
              {rec.source.terms && <p className="muted">{rec.source.terms}</p>}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
