import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORY_DEFS, GROUP_LABELS } from '../lib/categories';
import { BOND_FAMILIES } from '../lib/bands';
import { EMPTY_FILTERS, activeCount, applyFilters, filtersToParams, parseFilters, type LibraryFilters } from '../features/library/filters';
import { ErrorBox, Formula, Loading, Sparkline, StatusBadge, statusLabel } from '../components/ui';
import { loadLibrary } from '../services/data';
import { useAsync } from '../services/useAsync';
import type { VerificationStatus } from '../lib/types';

const VIBRATIONS = ['tensión', 'flexión', 'tensión O–H', 'tensión N–H', 'tensión C=O', 'tensión C–O', 'tensión C=C', 'fuera del plano', 'tijera', 'balanceo'];
const catName = (id: string) => CATEGORY_DEFS.find((c) => c.id === id)?.name ?? id;

export default function Library() {
  const lib = useAsync(loadLibrary, []);
  const [sp, setSp] = useSearchParams();
  const f = parseFilters(sp);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<'doc' | 'name'>('doc');
  const set = (patch: Partial<LibraryFilters>) => setSp(filtersToParams({ ...f, ...patch }), { replace: true });
  const toggle = (k: 'categories' | 'groups' | 'bonds', v: string) => set({ [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] } as Partial<LibraryFilters>);
  const all = lib.data?.compounds ?? [];
  const results = useMemo(() => {
    const r = applyFilters(all, f);
    return sort === 'name' ? [...r].sort((a, b) => a.nameEs.localeCompare(b.nameEs, 'es')) : r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, sp.toString(), sort]);
  const groups = useMemo(() => [...new Set(all.flatMap((c) => c.functionalGroups))].sort((a, b) => (GROUP_LABELS[a] ?? a).localeCompare(GROUP_LABELS[b] ?? b, 'es')), [all]);
  const sources = useMemo(() => [...new Set(all.map((c) => c.source.name))], [all]);
  const counts = useMemo(() => Object.fromEntries(CATEGORY_DEFS.map((c) => [c.id, all.filter((x) => x.categories.includes(c.id)).length])), [all]);
  const n = activeCount(f);

  const chips: { label: string; clear: () => void }[] = [];
  if (f.q) chips.push({ label: `«${f.q}»`, clear: () => set({ q: '' }) });
  f.categories.forEach((c) => chips.push({ label: catName(c), clear: () => toggle('categories', c) }));
  f.groups.forEach((g) => chips.push({ label: GROUP_LABELS[g] ?? g, clear: () => toggle('groups', g) }));
  f.bonds.forEach((b) => chips.push({ label: `Enlace ${b}`, clear: () => toggle('bonds', b) }));
  if (f.wn !== null) chips.push({ label: `Banda a ${f.wn} ± ${f.tol} cm⁻¹`, clear: () => set({ wn: null }) });
  if (f.vibration) chips.push({ label: `Vibración: ${f.vibration}`, clear: () => set({ vibration: '' }) });
  if (f.source) chips.push({ label: `Fuente: ${f.source}`, clear: () => set({ source: '' }) });
  if (f.status) chips.push({ label: statusLabel(f.status as VerificationStatus), clear: () => set({ status: '' }) });

  const filterPanel = (
    <div className="filters">
      <div className="field">
        <label htmlFor="fq">Nombre, sinónimo o fórmula</label>
        <input id="fq" type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="p. ej. fenol, C7H8O, 1715" />
      </div>
      <fieldset>
        <legend>Categoría</legend>
        {CATEGORY_DEFS.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" checked={f.categories.includes(c.id)} onChange={() => toggle('categories', c.id)} disabled={!counts[c.id]} />
            {c.name} <span className="muted small">({counts[c.id] ?? 0})</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Número de onda de una banda</legend>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input aria-label="Número de onda (cm⁻¹)" type="number" inputMode="numeric" min={400} max={4000} value={f.wn ?? ''} onChange={(e) => set({ wn: e.target.value === '' ? null : Number(e.target.value) })} placeholder="cm⁻¹" />
          <select aria-label="Tolerancia" value={f.tol} onChange={(e) => set({ tol: Number(e.target.value) })} style={{ maxWidth: 110 }}>
            {[5, 10, 15, 25, 50].map((t) => (
              <option key={t} value={t}>
                ± {t}
              </option>
            ))}
          </select>
        </div>
      </fieldset>
      <fieldset>
        <legend>Enlaces presentes</legend>
        <div className="chips">
          {BOND_FAMILIES.filter((b) => b !== 'Otras' && all.some((c) => c.bonds.includes(b))).map((b) => (
            <button key={b} type="button" className={`chip toggle ${f.bonds.includes(b) ? 'on' : ''}`} aria-pressed={f.bonds.includes(b)} onClick={() => toggle('bonds', b)}>
              {b}
            </button>
          ))}
        </div>
      </fieldset>
      <details className="acc compact">
        <summary>Grupo funcional</summary>
        <div className="acc-body">
          {groups.map((g) => (
            <label key={g} className="check">
              <input type="checkbox" checked={f.groups.includes(g)} onChange={() => toggle('groups', g)} />
              {GROUP_LABELS[g] ?? g}
            </label>
          ))}
        </div>
      </details>
      <div className="field">
        <label htmlFor="fv">Tipo de vibración asignada</label>
        <select id="fv" value={f.vibration} onChange={(e) => set({ vibration: e.target.value })}>
          <option value="">Cualquiera</option>
          {VIBRATIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="fs">Fuente de los datos</label>
        <select id="fs" value={f.source} onChange={(e) => set({ source: e.target.value })}>
          <option value="">Todas</option>
          {sources.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="fe">Estado de verificación</label>
        <select id="fe" value={f.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Todos</option>
          <option value="verificado">Verificado</option>
          <option value="discrepancia-nombre">Nombre corregido</option>
          <option value="requiere-revision">Requiere revisión</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Biblioteca</h1>
        <p>Espectros IR clasificados por grupo funcional. Combine filtros: por ejemplo, «Fenoles» y una banda a 1250 cm⁻¹.</p>
      </div>
      {lib.error && <ErrorBox msg={lib.error} />}
      {lib.loading && <Loading what="la biblioteca" />}
      {lib.data && (
        <div className="lib-layout">
          <aside className="lib-side" aria-label="Filtros">
            {filterPanel}
          </aside>
          <section aria-live="polite">
            <div className="lib-bar">
              <button type="button" className="btn quiet filter-toggle" onClick={() => setOpen(true)}>
                Filtros{n ? ` (${n})` : ''}
              </button>
              <strong>
                {results.length} de {all.length} espectros
              </strong>
              <span className="spacer" />
              <label htmlFor="sort" className="small">
                Ordenar
              </label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as 'doc' | 'name')} style={{ width: 'auto' }}>
                <option value="doc">por categoría</option>
                <option value="name">alfabéticamente</option>
              </select>
            </div>
            {chips.length > 0 && (
              <div className="chips active-filters">
                {chips.map((c) => (
                  <span key={c.label} className="chip removable">
                    {c.label}
                    <button type="button" aria-label={`Quitar filtro ${c.label}`} onClick={c.clear}>
                      ×
                    </button>
                  </span>
                ))}
                <button type="button" className="btn small secondary" onClick={() => setSp(filtersToParams(EMPTY_FILTERS))}>
                  Quitar todos
                </button>
              </div>
            )}
            {results.length === 0 ? (
              <div className="empty">
                <p>Ningún espectro cumple todos los filtros.</p>
                <button type="button" className="btn secondary" onClick={() => setSp(filtersToParams(EMPTY_FILTERS))}>
                  Quitar filtros
                </button>
              </div>
            ) : (
              <ul className="result-grid">
                {results.map((c) => (
                  <li key={c.id}>
                    <Link to={`/espectro/${c.id}`} className="result">
                      <Sparkline values={c.thumb} className="result-spark" />
                      <span className="result-name">{c.nameEs}</span>
                      <span className="result-meta">
                        <Formula f={c.formula} />
                        <span className="muted">{c.name !== c.nameEs ? c.name : ''}</span>
                      </span>
                      <span className="result-cats small">
                        {c.categories.map(catName).join(', ')}
                      </span>
                      {c.verificationStatus !== 'verificado' && <StatusBadge s={c.verificationStatus} />}
                      {f.wn !== null && (
                        <span className="chip band small">
                          banda a {c.peakWavenumbers.filter((w) => Math.abs(w - f.wn!) <= f.tol).map((w) => w).join(', ')} cm⁻¹
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(false)} />
          <div className="filter-sheet" role="dialog" aria-label="Filtros">
            <div className="row">
              <h2 style={{ margin: 0 }}>Filtros</h2>
              <span className="spacer" />
              <button type="button" className="btn small" onClick={() => setOpen(false)}>
                Ver {results.length} resultados
              </button>
            </div>
            {filterPanel}
          </div>
        </>
      )}
    </div>
  );
}
