import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SpectrumPlot, { type PlotMarker, type PlotRegion } from '../components/SpectrumPlot';
import { ErrorBox, Formula, Loading } from '../components/ui';
import { CATEGORY_DEFS } from '../lib/categories';
import type { Assignment, CompoundIndexEntry, SpectrumRecord } from '../lib/types';
import { loadLibrary, loadSpectrum } from '../services/data';
import { readLocal, writeLocal } from '../services/localStore';
import { useAsync } from '../services/useAsync';

type Game = 'banda' | 'grupo' | 'detective';
interface Progress {
  [g: string]: { done: number; right: number };
}
const PKEY = 'actividades:progreso';
const catName = (id: string) => CATEGORY_DEFS.find((c) => c.id === id)?.name ?? id;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

export default function Activities() {
  const lib = useAsync(loadLibrary, []);
  const [game, setGame] = useState<Game | null>(null);
  const [progress, setProgress] = useState<Progress>(() => readLocal(PKEY, {}));
  const record = useCallback((g: Game, ok: boolean) => {
    setProgress((p) => {
      const cur = p[g] ?? { done: 0, right: 0 };
      const next = { ...p, [g]: { done: cur.done + 1, right: cur.right + (ok ? 1 : 0) } };
      writeLocal(PKEY, next);
      return next;
    });
  }, []);
  const games: { id: Game; title: string; desc: string }[] = [
    { id: 'banda', title: 'Encuentra la banda', desc: 'Toque en el espectro la banda que se pide.' },
    { id: 'grupo', title: 'Identifica el grupo funcional', desc: 'Vea un espectro sin nombre y elija su grupo principal.' },
    { id: 'detective', title: 'Detective IR', desc: 'Con la fórmula y el espectro, descubra cuál de los isómeros es.' },
  ];
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Actividades</h1>
        <p>Retos cortos y opcionales con espectros reales de la biblioteca. Cada respuesta incluye su explicación.</p>
      </div>
      {lib.error && <ErrorBox msg={lib.error} />}
      {lib.loading && <Loading what="la biblioteca" />}
      <div className="game-tabs" role="tablist">
        {games.map((g) => (
          <button key={g.id} type="button" role="tab" aria-selected={game === g.id} className={`game-tab ${game === g.id ? 'on' : ''}`} onClick={() => setGame(g.id)}>
            <strong>{g.title}</strong>
            <span className="small">{g.desc}</span>
            <span className="small muted">{progress[g.id] ? `${progress[g.id].right} de ${progress[g.id].done} correctas` : 'Sin intentos todavía'}</span>
          </button>
        ))}
      </div>
      {lib.data && game === 'banda' && <FindBand lib={lib.data.compounds} onResult={(ok) => record('banda', ok)} />}
      {lib.data && game === 'grupo' && <GroupQuiz lib={lib.data.compounds} onResult={(ok) => record('grupo', ok)} />}
      {lib.data && game === 'detective' && <Detective lib={lib.data.compounds} onResult={(ok) => record('detective', ok)} />}
      {!game && <p className="muted">Elija una actividad para empezar.</p>}
    </div>
  );
}

function useRecord(id: string | null) {
  const [rec, setRec] = useState<SpectrumRecord | null>(null);
  useEffect(() => {
    setRec(null);
    if (id) loadSpectrum(id).then(setRec).catch(() => setRec(null));
  }, [id]);
  return rec;
}

function Hints({ hints, shown, onMore }: { hints: string[]; shown: number; onMore: () => void }) {
  return (
    <div className="hints">
      {hints.slice(0, shown).map((h, i) => (
        <p key={i} className="hint small">
          Pista {i + 1}: {h}
        </p>
      ))}
      {shown < hints.length && (
        <button type="button" className="btn small quiet" onClick={onMore}>
          {shown ? 'Otra pista' : 'Pedir una pista'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Encuentra la banda
const TARGETS = [
  { ref: ['co-ketone', 'co-ketone-conj', 'co-ketone-c5', 'co-ester', 'co-ester-conj', 'co-ester-vinyl', 'co-acid', 'co-amide'], name: 'la tensión C=O', hint1: 'Busque entre 1830 y 1630 cm⁻¹.' },
  { ref: ['oh-hb', 'oh-acid'], name: 'la tensión O–H asociada', hint1: 'Busque a la izquierda, entre 3550 y 2500 cm⁻¹: es ancha.' },
  { ref: ['nh-amide'], name: 'una tensión N–H', hint1: 'Busque entre 3500 y 3100 cm⁻¹.' },
  { ref: ['co-alcohol', 'co-ether', 'co-ester-co', 'co-phenol'], name: 'la tensión C–O más intensa', hint1: 'Busque entre 1300 y 1000 cm⁻¹, en la huella dactilar.' },
  { ref: ['ch-sp2-arom'], name: 'la tensión C–H aromática', hint1: 'Está justo por encima de 3000 cm⁻¹.' },
];
function FindBand({ lib, onResult }: { lib: CompoundIndexEntry[]; onResult: (ok: boolean) => void }) {
  const [round, setRound] = useState(0);
  const [hint, setHint] = useState(0);
  const [answer, setAnswer] = useState<{ x: number; ok: boolean; target: Assignment } | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [target, setTarget] = useState(TARGETS[0]);
  useEffect(() => {
    const t = pick(TARGETS);
    setTarget(t);
    const pool = lib.filter((c) => c.verificationStatus === 'verificado' && c.keyBands.length);
    setId(pick(pool).id);
    setAnswer(null);
    setHint(0);
  }, [round, lib]);
  const rec = useRecord(id);
  const goal = useMemo(() => rec?.assignments.filter((a) => target.ref.includes(a.refId) && a.confidence !== 'baja').sort((a, b) => (a.observedY ?? 100) - (b.observedY ?? 100))[0], [rec, target]);
  useEffect(() => {
    if (rec && !goal) setRound((r) => r + 1); // este compuesto no tiene esa banda: se elige otro
  }, [rec, goal]);
  const onClick = useCallback(
    (x: number) => {
      if (!goal || answer) return;
      const tol = goal.observed > 2000 ? 60 : 25;
      const ok = Math.abs(x - goal.observed) <= tol;
      setAnswer({ x, ok, target: goal });
      onResult(ok);
    },
    [goal, answer, onResult],
  );
  const markers: PlotMarker[] = answer ? [{ x: answer.x, y: 50, kind: 'user', label: 'su respuesta' }, { x: answer.target.observed, y: answer.target.observedY ?? 50, kind: 'confirmed', label: answer.target.bond }] : [];
  const regions: PlotRegion[] = hint >= 3 && goal ? [{ from: goal.rangeMin, to: goal.rangeMax }] : [];
  if (!rec || !goal) return <Loading what="el reto" />;
  return (
    <section className="game">
      <h2>
        Toque {target.name} en el espectro de {rec.nameEs}
      </h2>
      <SpectrumPlot traces={[{ x: rec.data!.x, y: rec.data!.y, name: rec.nameEs }]} markers={markers} regions={regions} signal="transmittance" yLabel="Transmitancia (%)" onClickX={onClick} ariaLabel="Espectro del reto" showLabels />
      {!answer && <Hints hints={[target.hint1, `Es una banda ${goal.intensity ?? ''}${goal.shape ? ` y ${goal.shape}` : ''}.`, 'Se ha sombreado el intervalo donde debe buscar.']} shown={hint} onMore={() => setHint((h) => h + 1)} />}
      {answer && (
        <div className={`feedback ${answer.ok ? 'ok' : 'no'}`} role="status">
          <p>
            <strong>{answer.ok ? 'Correcto.' : 'No es esa.'}</strong> {target.name[0].toUpperCase() + target.name.slice(1)} está a {Math.round(answer.target.observed)} cm⁻¹
            {answer.ok ? '' : `; usted marcó ${Math.round(answer.x)} cm⁻¹`}.
          </p>
          <p className="small">{answer.target.explanation}</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setRound((r) => r + 1)}>
              Siguiente reto
            </button>
            <Link className="btn quiet" to={`/espectro/${rec.id}`}>
              Ver la ficha
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Identifica el grupo funcional
function GroupQuiz({ lib, onResult }: { lib: CompoundIndexEntry[]; onResult: (ok: boolean) => void }) {
  const [round, setRound] = useState(0);
  const [hint, setHint] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const q = useMemo(() => {
    const cats = ['alcoholes', 'fenoles', 'acidos-carboxilicos', 'cetonas', 'esteres', 'amidas', 'eteres', 'alcanos', 'aromaticos'];
    const pool = lib.filter((c) => c.verificationStatus === 'verificado' && cats.includes(c.primaryCategory));
    const c = pick(pool);
    const wrong = shuffle(cats.filter((k) => k !== c.primaryCategory && !c.categories.includes(k))).slice(0, 3);
    return { c, options: shuffle([c.primaryCategory, ...wrong]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, lib]);
  const rec = useRecord(q.c.id);
  useEffect(() => {
    setChosen(null);
    setHint(0);
  }, [round]);
  if (!rec) return <Loading what="el reto" />;
  const ok = chosen === q.c.primaryCategory;
  const cat = CATEGORY_DEFS.find((c) => c.id === q.c.primaryCategory)!;
  return (
    <section className="game">
      <h2>¿A qué grupo funcional pertenece principalmente este compuesto?</h2>
      <SpectrumPlot traces={[{ x: rec.data!.x, y: rec.data!.y, name: 'Compuesto desconocido' }]} signal="transmittance" yLabel="Transmitancia (%)" ariaLabel="Espectro del compuesto desconocido" height="320px" />
      <div className="options" role="group" aria-label="Opciones">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={!!chosen}
            className={`option ${chosen && o === q.c.primaryCategory ? 'right' : ''} ${chosen === o && !ok ? 'wrong' : ''}`}
            onClick={() => {
              setChosen(o);
              onResult(o === q.c.primaryCategory);
            }}
          >
            {catName(o)}
          </button>
        ))}
      </div>
      {!chosen && (
        <Hints
          hints={['Empiece por la región de 1830–1650 cm⁻¹: ¿hay C=O?', `Bandas destacadas: ${q.c.keyBands.map((b) => `${b} cm⁻¹`).join(', ') || 'sólo C–H'}.`, `Fórmula molecular: ${q.c.formula}.`]}
          shown={hint}
          onMore={() => setHint((h) => h + 1)}
        />
      )}
      {chosen && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
          <p>
            <strong>{ok ? 'Correcto.' : `No: es de ${cat.name.toLowerCase()}.`}</strong> Es {rec.nameEs} (<Formula f={rec.formula} />). {cat.name}: {cat.keyBands}.
          </p>
          {!ok && chosen && <p className="small">Usted eligió {catName(chosen).toLowerCase()}, cuyas bandas típicas son {CATEGORY_DEFS.find((c) => c.id === chosen)?.keyBands}. Compare con lo que muestra el espectro.</p>}
          {rec.distinctive.slice(0, 2).map((d, i) => (
            <p key={i} className="small">
              {d}
            </p>
          ))}
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setRound((r) => r + 1)}>
              Siguiente
            </button>
            <Link className="btn quiet" to={`/espectro/${rec.id}`}>
              Ver la ficha
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Detective IR
function Detective({ lib, onResult }: { lib: CompoundIndexEntry[]; onResult: (ok: boolean) => void }) {
  const [round, setRound] = useState(0);
  const [hint, setHint] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const groups = useMemo(() => {
    const by: Record<string, CompoundIndexEntry[]> = {};
    for (const c of lib) if (c.verificationStatus === 'verificado') (by[c.formula] ??= []).push(c);
    return Object.values(by).filter((g) => g.length >= 3 && new Set(g.map((c) => c.primaryCategory)).size >= 1);
  }, [lib]);
  const q = useMemo(() => {
    const g = pick(groups);
    const opts = shuffle(g).slice(0, 4);
    return { answer: pick(opts), options: opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, groups]);
  const rec = useRecord(q.answer.id);
  useEffect(() => {
    setChosen(null);
    setHint(0);
  }, [round]);
  if (!rec) return <Loading what="el caso" />;
  const ok = chosen === q.answer.id;
  const sameGroup = new Set(q.options.map((o) => o.primaryCategory)).size === 1;
  return (
    <section className="game">
      <h2>
        Caso: un compuesto de fórmula <Formula f={q.answer.formula} />. ¿Cuál es?
      </h2>
      <SpectrumPlot traces={[{ x: rec.data!.x, y: rec.data!.y, name: 'Compuesto del caso' }]} signal="transmittance" yLabel="Transmitancia (%)" ariaLabel="Espectro del caso" height="320px" />
      <div className="options" role="group" aria-label="Sospechosos">
        {q.options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={!!chosen}
            className={`option ${chosen && o.id === q.answer.id ? 'right' : ''} ${chosen === o.id && !ok ? 'wrong' : ''}`}
            onClick={() => {
              setChosen(o.id);
              onResult(o.id === q.answer.id);
            }}
          >
            {o.nameEs}
          </button>
        ))}
      </div>
      {!chosen && (
        <Hints
          hints={[
            sameGroup ? 'Todos los sospechosos tienen el mismo grupo funcional: fíjese en la huella dactilar y en las flexiones C–H.' : 'Los sospechosos tienen grupos distintos: decida primero si hay O–H, N–H o C=O.',
            `Bandas destacadas del caso: ${q.answer.keyBands.map((b) => `${b} cm⁻¹`).join(', ') || 'sólo bandas C–H y de la huella dactilar'}.`,
            `El compuesto pertenece a: ${q.answer.categories.map(catName).join(', ')}.`,
          ]}
          shown={hint}
          onMore={() => setHint((h) => h + 1)}
        />
      )}
      {chosen && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
          <p>
            <strong>{ok ? 'Caso resuelto.' : 'No es ese.'}</strong> Es {rec.nameEs}.
          </p>
          {rec.distinctive.slice(0, 2).map((d, i) => (
            <p key={i} className="small">
              {d}
            </p>
          ))}
          {!ok && <p className="small">Compare los dos espectros para ver la diferencia: <Link to={`/comparar?ids=${q.answer.id},${chosen}`}>abrir el comparador</Link>.</p>}
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setRound((r) => r + 1)}>
              Otro caso
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
