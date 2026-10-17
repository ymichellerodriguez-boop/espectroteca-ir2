import { useState } from 'react';
import { Link } from 'react-router-dom';

const AMU = 1.66054e-27;
const C_CM = 2.99792458e10;
/** Constantes de fuerza aproximadas (N/m), valores didácticos habituales en los textos de espectroscopía. */
const BONDS = [
  { id: 'C–H', m1: 12, m2: 1.008, k: 500 },
  { id: 'O–H', m1: 16, m2: 1.008, k: 770 },
  { id: 'C–C', m1: 12, m2: 12, k: 450 },
  { id: 'C=C', m1: 12, m2: 12, k: 950 },
  { id: 'C≡C', m1: 12, m2: 12, k: 1560 },
  { id: 'C=O', m1: 12, m2: 16, k: 1200 },
  { id: 'C–D', m1: 12, m2: 2.014, k: 500 },
];

export function HookeCalculator() {
  const [b, setB] = useState(BONDS[0]);
  const [k, setK] = useState(b.k);
  const mu = (b.m1 * b.m2) / (b.m1 + b.m2);
  const wn = (1 / (2 * Math.PI * C_CM)) * Math.sqrt(k / (mu * AMU));
  return (
    <div className="panel widget">
      <h4>Modelo del oscilador armónico</h4>
      <p className="small">
        ṽ = (1 / 2πc) · √(k / μ). Un enlace más fuerte (k mayor) o átomos más ligeros (μ menor) vibran a mayor número de onda.
      </p>
      <div className="row">
        <div className="field" style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor="hb">Enlace</label>
          <select
            id="hb"
            value={b.id}
            onChange={(e) => {
              const nb = BONDS.find((x) => x.id === e.target.value)!;
              setB(nb);
              setK(nb.k);
            }}
          >
            {BONDS.map((x) => (
              <option key={x.id}>{x.id}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 2, minWidth: 200 }}>
          <label htmlFor="hk">Constante de fuerza k: {k} N/m</label>
          <input id="hk" type="range" min={200} max={2000} step={10} value={k} onChange={(e) => setK(Number(e.target.value))} />
        </div>
      </div>
      <p className="widget-result">
        μ = {mu.toFixed(3)} u → ṽ ≈ <strong>{Math.round(wn)} cm⁻¹</strong>
      </p>
      <p className="small muted">Estimación del modelo armónico: los valores reales difieren por la anarmonicidad y el acoplamiento con otras vibraciones. Compare C–H y C–D: sólo cambia la masa.</p>
    </div>
  );
}

export function WavelengthConverter() {
  const [um, setUm] = useState(5.85);
  return (
    <div className="panel widget">
      <h4>Longitud de onda y número de onda</h4>
      <div className="field">
        <label htmlFor="wl">Longitud de onda: {um.toFixed(2)} µm</label>
        <input id="wl" type="range" min={2.5} max={25} step={0.05} value={um} onChange={(e) => setUm(Number(e.target.value))} />
      </div>
      <p className="widget-result">
        ṽ = 10⁴ / λ(µm) = <strong>{Math.round(1e4 / um)} cm⁻¹</strong>
      </p>
      <p className="small muted">5,85 µm corresponde a ≈1710 cm⁻¹, la región del C=O. El número de onda es proporcional a la energía; la longitud de onda, inversamente.</p>
    </div>
  );
}

export function TAConverter() {
  const [t, setT] = useState(10);
  const a = -Math.log10(t / 100);
  return (
    <div className="panel widget">
      <h4>Transmitancia ↔ absorbancia</h4>
      <div className="field">
        <label htmlFor="tt">Transmitancia: {t} %</label>
        <input id="tt" type="range" min={1} max={100} value={t} onChange={(e) => setT(Number(e.target.value))} />
      </div>
      <p className="widget-result">
        A = −log₁₀(T) = −log₁₀({(t / 100).toFixed(2)}) = <strong>{a.toFixed(2)}</strong>
      </p>
      <svg viewBox="0 0 300 70" className="ta-svg" aria-hidden="true">
        <rect x="0" y="10" width="300" height="20" rx="4" fill="#f1e3e6" />
        <rect x="0" y="10" width={3 * t} height="20" rx="4" fill="#b8336a" opacity=".7" />
        <text x="4" y="48" fontSize="11">Luz que atraviesa la muestra: {t} %</text>
        <text x="4" y="64" fontSize="11">Absorbida: {100 - t} %</text>
      </svg>
      <p className="small muted">La relación no es lineal: pasar de 10 % a 1 % de transmitancia suma una unidad completa de absorbancia.</p>
    </div>
  );
}

export function VibrationDemo() {
  const [mode, setMode] = useState<'sim' | 'asim' | 'tijera' | 'balanceo'>('sim');
  return (
    <div className="panel widget">
      <h4>Modos de vibración de un CH₂</h4>
      <div className="btn-row">
        {(
          [
            ['sim', 'Tensión simétrica'],
            ['asim', 'Tensión asimétrica'],
            ['tijera', 'Flexión en tijera'],
            ['balanceo', 'Balanceo'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" className={`btn small ${mode === k ? '' : 'quiet'}`} onClick={() => setMode(k)} aria-pressed={mode === k}>
            {l}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 240 150" className={`vib vib-${mode}`} role="img" aria-label={`Animación: ${mode}`}>
        <line className="b1" x1="120" y1="95" x2="70" y2="40" />
        <line className="b2" x1="120" y1="95" x2="170" y2="40" />
        <circle className="h1" cx="70" cy="40" r="13" />
        <circle className="h2" cx="170" cy="40" r="13" />
        <circle cx="120" cy="95" r="22" className="c" />
        <text x="120" y="101" textAnchor="middle" className="lbl">C</text>
      </svg>
      <p className="small">
        {mode === 'sim' && 'Ambos enlaces C–H se alargan y acortan a la vez (≈2850 cm⁻¹ para CH₂).'}
        {mode === 'asim' && 'Un enlace se alarga mientras el otro se acorta (≈2925 cm⁻¹): requiere algo más de energía que la simétrica.'}
        {mode === 'tijera' && 'Cambia el ángulo H–C–H (≈1465 cm⁻¹). Las flexiones necesitan menos energía que las tensiones.'}
        {mode === 'balanceo' && 'Los dos H oscilan juntos a un lado y a otro (≈720 cm⁻¹ en cadenas de cuatro o más CH₂).'}
      </p>
    </div>
  );
}

const MAP = [
  { hi: 4000, lo: 2500, label: 'Enlaces con H', detail: 'O–H, N–H, C–H (sp, sp², sp³), S–H', ex: '/biblioteca?enlace=O%E2%80%93H' },
  { hi: 2500, lo: 2000, label: 'Triples', detail: 'C≡N, C≡C, y artefactos de CO₂', ex: '/biblioteca?enlace=C%E2%89%A1N' },
  { hi: 2000, lo: 1500, label: 'Dobles', detail: 'C=O, C=C, C=N, anillos, flexión N–H', ex: '/biblioteca?enlace=C%3DO' },
  { hi: 1500, lo: 400, label: 'Huella dactilar', detail: 'C–O, C–N, C–X, flexiones y acoplamientos', ex: '/aprender/huella' },
];
export function RegionMap() {
  const [sel, setSel] = useState(0);
  const sx = (w: number) => ((4000 - w) / 3600) * 100;
  return (
    <div className="panel widget">
      <h4>Mapa de regiones del IR medio</h4>
      <div className="region-map" role="tablist" aria-label="Regiones">
        {MAP.map((m, i) => (
          <button
            key={m.label}
            type="button"
            role="tab"
            aria-selected={sel === i}
            className={sel === i ? 'on' : ''}
            style={{ left: `${sx(m.hi)}%`, width: `${sx(Math.max(m.lo, 400)) - sx(m.hi)}%` }}
            onClick={() => setSel(i)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="region-axis small">
        <span>4000</span>
        <span>2500</span>
        <span>2000</span>
        <span>1500</span>
        <span>400 cm⁻¹</span>
      </div>
      <p>
        <strong>
          {MAP[sel].label} ({MAP[sel].hi}–{MAP[sel].lo} cm⁻¹):
        </strong>{' '}
        {MAP[sel].detail}. <Link to={MAP[sel].ex}>Ver ejemplos</Link>
      </p>
    </div>
  );
}

const TREE: Record<string, { q: string; yes: string; no: string } | { result: string; link: string }> = {
  start: { q: '¿Hay una banda intensa entre 1830 y 1650 cm⁻¹ (C=O)?', yes: 'co', no: 'nco' },
  co: { q: '¿Hay una O–H muy ancha entre 3300 y 2500 cm⁻¹ que se monta sobre las C–H?', yes: 'acid', no: 'co2' },
  co2: { q: '¿Hay una o dos bandas N–H entre 3500 y 3100 cm⁻¹?', yes: 'amide', no: 'co3' },
  co3: { q: '¿Hay dos bandas débiles cerca de 2820 y 2720 cm⁻¹?', yes: 'ald', no: 'co4' },
  co4: { q: '¿Hay bandas C–O muy intensas entre 1300 y 1000 cm⁻¹?', yes: 'ester', no: 'ketone' },
  nco: { q: '¿Hay una banda O–H ancha e intensa entre 3550 y 3200 cm⁻¹?', yes: 'oh', no: 'nco2' },
  oh: { q: '¿Hay C–H por encima de 3000 cm⁻¹ y bandas de anillo cerca de 1600 y 1500 cm⁻¹?', yes: 'phenol', no: 'alcohol' },
  nco2: { q: '¿Hay una banda aguda entre 2260 y 2210 cm⁻¹?', yes: 'nitrile', no: 'nco3' },
  nco3: { q: '¿Hay dos bandas intensas cerca de 1530 y 1350 cm⁻¹?', yes: 'nitro', no: 'nco4' },
  nco4: { q: '¿Hay una C–O–C muy intensa entre 1150 y 1070 cm⁻¹ y nada más llamativo?', yes: 'ether', no: 'hc' },
  acid: { result: 'Probablemente un ácido carboxílico.', link: '/biblioteca?categoria=acidos-carboxilicos' },
  amide: { result: 'Probablemente una amida (primaria si hay dos N–H, secundaria si hay una).', link: '/biblioteca?categoria=amidas' },
  ald: { result: 'Probablemente un aldehído.', link: '/biblioteca?categoria=aldehidos' },
  ester: { result: 'Probablemente un éster (C=O ≈1740 cm⁻¹ y dos C–O intensas).', link: '/biblioteca?categoria=esteres' },
  ketone: { result: 'Probablemente una cetona. Mire la posición exacta del C=O: conjugación y anillos la desplazan.', link: '/biblioteca?categoria=cetonas' },
  phenol: { result: 'Probablemente un fenol.', link: '/biblioteca?categoria=fenoles' },
  alcohol: { result: 'Probablemente un alcohol. Confírmelo con una C–O intensa entre 1260 y 1000 cm⁻¹.', link: '/biblioteca?categoria=alcoholes' },
  nitrile: { result: 'Probablemente un nitrilo (o un alquino, si la banda es débil y hay ≡C–H a 3300 cm⁻¹).', link: '/biblioteca?enlace=C%E2%89%A1N' },
  nitro: { result: 'Probablemente un nitrocompuesto.', link: '/biblioteca?categoria=nitrocompuestos' },
  ether: { result: 'Posiblemente un éter.', link: '/biblioteca?categoria=eteres' },
  hc: { result: 'Probablemente un hidrocarburo: compruebe si hay C–H sp² (aromático o alqueno) o sólo sp³ (alcano).', link: '/biblioteca?categoria=alcanos' },
};
export function DecisionTree() {
  const [path, setPath] = useState<string[]>(['start']);
  const node = TREE[path[path.length - 1]];
  return (
    <div className="panel widget">
      <h4>Recorrido de decisión</h4>
      <ol className="tree-path small">
        {path.slice(0, -1).map((p, i) => (
          <li key={i}>
            {(TREE[p] as { q: string }).q} <strong>{path[i + 1] === (TREE[p] as { yes: string }).yes ? 'Sí' : 'No'}</strong>
          </li>
        ))}
      </ol>
      {'q' in node ? (
        <>
          <p className="widget-q">{node.q}</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setPath([...path, node.yes])}>
              Sí
            </button>
            <button type="button" className="btn quiet" onClick={() => setPath([...path, node.no])}>
              No
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="widget-result">{node.result}</p>
          <div className="btn-row">
            <Link className="btn secondary" to={node.link}>
              Ver ejemplos en la biblioteca
            </Link>
            <button type="button" className="btn quiet" onClick={() => setPath(['start'])}>
              Empezar de nuevo
            </button>
          </div>
        </>
      )}
      <p className="small muted">Es una guía orientativa: muchas moléculas tienen varios grupos y requieren mirar todas las señales a la vez.</p>
    </div>
  );
}
