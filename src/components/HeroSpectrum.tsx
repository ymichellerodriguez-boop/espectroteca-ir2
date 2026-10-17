import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SpectrumRecord } from '../lib/types';

/**
 * Espectro real de la biblioteca dibujado en SVG (sin Plotly, para que la portada cargue rápido).
 * Las bandas diagnósticas se sombrean en amarillo; al pasar el cursor o enfocar una banda se lee su explicación.
 */
export default function HeroSpectrum({ rec }: { rec: SpectrumRecord }) {
  const W = 1000;
  const H = 300;
  const PAD = { l: 8, r: 8, t: 40, b: 34 };
  const sx = (wn: number) => PAD.l + ((4000 - wn) / 3600) * (W - PAD.l - PAD.r);
  const sy = (t: number) => PAD.t + (1 - t / 100) * (H - PAD.t - PAD.b);
  const path = useMemo(() => {
    const { x, y } = rec.data!;
    let d = '';
    let pen = false;
    for (let i = x.length - 1; i >= 0; i--) {
      const v = y[i];
      if (v === null || x[i] < 400) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${sx(x[i]).toFixed(1)},${sy(v).toFixed(1)}`;
      pen = true;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec]);
  const bands = rec.assignments.filter((a) => a.confidence === 'alta' || ['ch-sp3'].includes(a.refId)).slice(0, 4);
  const [active, setActive] = useState(() => Math.max(0, bands.findIndex((b) => b.bond === 'C=O')));
  const a = bands[active];
  return (
    <figure className="hero-spectrum">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Espectro IR de ${rec.nameEs} con sus bandas principales señaladas`}>
        {bands.map((b, i) => {
          const half = b.observed > 2000 ? 70 : 35;
          const x0 = sx(b.observed + half);
          const x1 = sx(b.observed - half);
          return (
            <g
              key={b.id}
              className={`hb ${i === active ? 'on' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`${b.bond}, ${Math.round(b.observed)} cm⁻¹`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
            >
              <rect x={x0} y={PAD.t - 6} width={x1 - x0} height={H - PAD.t - PAD.b + 6} rx="8" />
              <text x={(x0 + x1) / 2} y={PAD.t - 14} textAnchor="middle">
                {b.bond}
              </text>
            </g>
          );
        })}
        <path d={path} className="hs-line" />
        {[4000, 3000, 2000, 1500, 1000, 500].map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={H - PAD.b} y2={H - PAD.b + 6} className="hs-tick" />
            <text x={sx(t)} y={H - 8} textAnchor={t === 4000 ? 'start' : t === 500 ? 'middle' : 'middle'} className="hs-axis">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="hs-tick" />
      </svg>
      <figcaption>
        {a && (
          <p className="hs-explain" aria-live="polite">
            <strong>
              {a.bond} · {Math.round(a.observed)} cm⁻¹
            </strong>{' '}
            {a.explanation.split('. ')[0]}.
          </p>
        )}
        <p className="small muted">
          {rec.nameEs} ({rec.name}), {rec.technique?.toLowerCase()}. Datos: {rec.source.name}, {rec.sourceIdentifier}; curva digitalizada de la imagen original.{' '}
          <Link to={`/espectro/${rec.id}`}>Abrir la ficha completa</Link>
        </p>
      </figcaption>
    </figure>
  );
}
