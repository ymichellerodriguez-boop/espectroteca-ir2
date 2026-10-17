import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SpectrumPlot, { type PlotTrace } from '../components/SpectrumPlot';
import { ErrorBox, Formula } from '../components/ui';
import { COMPARE_REGIONS, describeDifferences, regionHits } from '../features/compare/regions';
import { norm } from '../features/library/filters';
import type { SignalKind, SpectrumRecord } from '../lib/types';
import { asset, loadLibrary, loadSpectrum } from '../services/data';
import { useAsync } from '../services/useAsync';
import { getUserSpectrum } from '../services/userSpectrum';

const COLORS = ['#b8336a', '#2b6cb0', '#8a6d00'];

interface Item {
  key: string;
  name: string;
  x: number[];
  y: (number | null)[];
  signal: SignalKind;
  yLabel: string;
  technique?: string;
  origin: string;
  image?: string;
  rec?: SpectrumRecord;
}

export default function Compare() {
  const lib = useAsync(loadLibrary, []);
  const [sp, setSp] = useSearchParams();
  const ids = (sp.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3);
  const withUser = sp.get('usuario') === '1' && !!getUserSpectrum();
  const [recs, setRecs] = useState<Record<string, SpectrumRecord>>({});
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(false);

  useEffect(() => {
    ids.filter((id) => !recs[id]).forEach((id) =>
      loadSpectrum(id)
        .then((r) => setRecs((m) => ({ ...m, [id]: r })))
        .catch((e) => setErr((e as Error).message)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const setIds = (next: string[]) => {
    const p = new URLSearchParams(sp);
    if (next.length) p.set('ids', next.join(','));
    else p.delete('ids');
    setSp(p, { replace: true });
  };
  const max = withUser ? 2 : 3;

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    const u = getUserSpectrum();
    if (withUser && u) out.push({ key: 'user', name: `${u.name} (suyo)`, x: u.spectrum.x, y: u.spectrum.y.map((v) => (Number.isFinite(v) ? v : null)), signal: u.spectrum.signal, yLabel: u.spectrum.yLabel, origin: u.origin });
    for (const id of ids) {
      const r = recs[id];
      if (r?.data) out.push({ key: id, name: r.nameEs, x: r.data.x, y: r.data.y, signal: 'transmittance', yLabel: 'Transmitancia (%)', technique: r.technique, origin: r.data.origin === 'jcamp-dx' ? 'JCAMP-DX' : 'curva digitalizada', image: r.originalImage, rec: r });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recs, sp.toString(), withUser]);

  const signals = new Set(items.map((i) => i.signal));
  const sameSignal = signals.size <= 1;
  const traces: PlotTrace[] = items.map((it, i) => ({
    x: it.x,
    y: offset ? it.y.map((v) => (v === null ? null : v + i * (it.signal === 'transmittance' ? 25 : 0.5))) : it.y,
    name: offset && i ? `${it.name} (desplazado +${it.signal === 'transmittance' ? 25 * i : 0.5 * i})` : it.name,
    color: COLORS[i],
  }));
  const hits = useMemo(() => items.map((it) => regionHits(it.x, it.y, it.signal)), [items]);
  const diffs = items.length >= 2 ? describeDifferences(items.map((i) => i.name), hits) : [];

  const warnings: string[] = [];
  if (!sameSignal) warnings.push('Hay espectros en transmitancia y en absorbancia: no se superponen numéricamente. Se muestran por separado.');
  const techs = new Set(items.map((i) => i.technique).filter(Boolean));
  if (techs.size > 1) warnings.push(`Técnicas de muestreo distintas (${[...techs].join('; ')}): el estado físico cambia la forma y la posición de las bandas O–H y N–H y la intensidad relativa.`);
  if (items.some((i) => i.origin.includes('digitalizada'))) warnings.push('Las curvas de la biblioteca están digitalizadas de imágenes (resolución ≈4–8 cm⁻¹): diferencias de unos pocos cm⁻¹ no son significativas.');
  if (items.some((i) => i.key === 'user')) warnings.push('Su espectro puede tener otra resolución, escala o línea base: compare posiciones de bandas, no intensidades absolutas.');

  const matches = useMemo(() => {
    if (!lib.data || !q.trim()) return [];
    const t = norm(q);
    return lib.data.compounds.filter((c) => [c.name, c.nameEs, c.formula, ...c.synonyms].some((s) => norm(s).includes(t))).slice(0, 8);
  }, [lib.data, q]);

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Comparar espectros</h1>
        <p>Superponga dos o tres espectros y vea en qué regiones se diferencian.</p>
      </div>
      {err && <ErrorBox msg={err} />}
      <div className="panel compare-pick">
        <div className="chips">
          {withUser && <span className="chip" style={{ borderColor: COLORS[0] }}>Su espectro: {getUserSpectrum()!.name}</span>}
          {ids.map((id) => (
            <span key={id} className="chip removable">
              {recs[id]?.nameEs ?? id}
              <button type="button" aria-label={`Quitar ${recs[id]?.nameEs ?? id}`} onClick={() => setIds(ids.filter((x) => x !== id))}>
                ×
              </button>
            </span>
          ))}
        </div>
        {ids.length < max ? (
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="cq">Añadir un espectro de la biblioteca ({ids.length + (withUser ? 1 : 0)} de 3)</label>
            <input id="cq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o fórmula, p. ej. «butanol»" />
            {matches.length > 0 && (
              <ul className="pick-list">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={ids.includes(m.id)}
                      onClick={() => {
                        setIds([...ids, m.id]);
                        setQ('');
                      }}
                    >
                      <span>{m.nameEs}</span> <Formula f={m.formula} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="small muted">Máximo de tres espectros alcanzado.</p>
        )}
        {!getUserSpectrum() && (
          <p className="small muted">
            Para incluir un espectro propio, analícelo primero en <Link to="/analizar">Analizar mi espectro</Link>.
          </p>
        )}
        {getUserSpectrum() && !withUser && (
          <button type="button" className="btn small secondary" onClick={() => { const p = new URLSearchParams(sp); p.set('usuario', '1'); setSp(p); }}>
            Incluir mi espectro analizado
          </button>
        )}
      </div>

      {items.length < 2 ? (
        <div className="empty">
          <p>Elija al menos dos espectros. Algunas parejas instructivas:</p>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn quiet" onClick={() => setIds(['1-butanol', 'butyric-acid'])}>1-Butanol y ácido butírico</button>
            <button type="button" className="btn quiet" onClick={() => setIds(['cyclohexanone', 'cyclopentanone'])}>Ciclohexanona y ciclopentanona</button>
            <button type="button" className="btn quiet" onClick={() => setIds(['acetamide', 'n-n-dimethylacetamide', 'ethyl-acetate'])}>Acetamida, DMAc y acetato de etilo</button>
            <button type="button" className="btn quiet" onClick={() => setIds(['o-xylene', 'm-xylene', 'p-xylene'])}>Los tres xilenos</button>
          </div>
        </div>
      ) : (
        <div className="stack section">
          {warnings.length > 0 && (
            <div className="alert warn small">
              <strong>Antes de comparar</strong>
              <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {sameSignal ? (
            <SpectrumPlot
              traces={traces}
              signal={items[0].signal}
              yLabel={items[0].yLabel + (offset ? ' (curvas desplazadas)' : '')}
              fileName="comparacion"
              ariaLabel={`Comparación de ${items.map((i) => i.name).join(', ')}`}
              toolbar={
                <label className="check small">
                  <input type="checkbox" checked={offset} onChange={(e) => setOffset(e.target.checked)} /> Desplazar verticalmente
                </label>
              }
            />
          ) : (
            items.map((it, i) => <SpectrumPlot key={it.key} traces={[{ ...traces[i], y: it.y }]} signal={it.signal} yLabel={it.yLabel} ariaLabel={it.name} fileName={it.key} height="300px" />)
          )}
          {offset && <p className="small muted">Desplazamiento sólo visual: a cada curva se le suma una constante para separarlas; los valores del cursor incluyen ese desplazamiento.</p>}

          <section>
            <h2>Diferencias por región</h2>
            <ul className="diff-list">
              {diffs.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Región</th>
                    {items.map((it, i) => (
                      <th key={it.key} style={{ color: COLORS[i] }}>
                        {it.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_REGIONS.map((r, ri) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.label}</strong>
                        <br />
                        <span className="small muted">
                          {r.hi}–{r.lo} cm⁻¹
                        </span>
                      </td>
                      {hits.map((h, i) => (
                        <td key={i}>{h[COMPARE_REGIONS[ri].id] ? (h[r.id]!.broad ? 'absorción ancha en toda la región' : `${h[r.id]!.wn} cm⁻¹ ${h[r.id]!.rel >= 0.35 ? '(intensa)' : h[r.id]!.rel >= 0.12 ? '(media)' : '(débil)'}`) : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted">Banda más prominente de cada región, detectada en los datos de la curva. «—» significa que no hay una banda clara.</p>
          </section>

          {items.some((i) => i.image) && (
            <section>
              <h2>Imágenes originales lado a lado</h2>
              <div className="side-images">
                {items.filter((i) => i.image).map((it) => (
                  <figure key={it.key}>
                    <img src={asset(it.image!)} alt={`Espectro original de ${it.name}`} loading="lazy" />
                    <figcaption className="small">
                      <Link to={`/espectro/${it.key}`}>{it.name}</Link> · {it.technique}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
