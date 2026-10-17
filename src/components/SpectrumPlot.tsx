import { useEffect, useRef, useState } from 'react';
import type { SignalKind } from '../lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type PlotlyT = typeof import('plotly.js-basic-dist-min').default;
let plotlyPromise: Promise<PlotlyT> | null = null;
const getPlotly = () => (plotlyPromise ??= import('plotly.js-basic-dist-min').then((m) => m.default));

export interface PlotTrace {
  x: number[];
  y: (number | null)[];
  name: string;
  color?: string;
  dash?: 'solid' | 'dot' | 'dash';
}
export interface PlotMarker {
  x: number;
  y: number;
  label?: string;
  kind: 'table' | 'detected' | 'assigned' | 'user' | 'confirmed';
  hover?: string;
}
export interface PlotRegion {
  from: number;
  to: number;
  label?: string;
}

interface Props {
  traces: PlotTrace[];
  markers?: PlotMarker[];
  regions?: PlotRegion[];
  signal: SignalKind;
  yLabel: string;
  showLabels?: boolean;
  height?: string;
  xRange?: [number, number];
  onClickX?: (x: number, y: number | null) => void;
  /** nombre de archivo para «Descargar PNG» */
  fileName?: string;
  toolbar?: React.ReactNode;
  ariaLabel: string;
}

const MARKER_STYLE: Record<PlotMarker['kind'], { color: string; symbol: string; size: number; name: string }> = {
  table: { color: '#2b6cb0', symbol: 'triangle-down', size: 9, name: 'Tabla de picos de la fuente' },
  detected: { color: '#8a7f85', symbol: 'circle-open', size: 9, name: 'Pico detectado (cálculo)' },
  assigned: { color: '#b8336a', symbol: 'diamond', size: 10, name: 'Asignación propuesta' },
  confirmed: { color: '#2f7d4f', symbol: 'star', size: 12, name: 'Asignación confirmada' },
  user: { color: '#8a6d00', symbol: 'x', size: 10, name: 'Marcado por usted' },
};

export default function SpectrumPlot({ traces, markers = [], regions = [], signal, yLabel, showLabels = true, xRange, onClickX, fileName = 'espectro', toolbar, ariaLabel, height }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plotly = useRef<PlotlyT | null>(null);
  const narrow = typeof window !== 'undefined' && window.innerWidth < 600;

  useEffect(() => {
    let alive = true;
    getPlotly()
      .then((P) => {
        if (!alive) return;
        plotly.current = P;
        setReady(true);
      })
      .catch(() => setError('No se pudo cargar el motor de gráficos. Compruebe su conexión y recargue la página.'));
    return () => {
      alive = false;
      if (el.current && plotly.current) plotly.current.purge(el.current);
    };
  }, []);

  useEffect(() => {
    const P = plotly.current;
    if (!ready || !P || !el.current) return;
    const data: any[] = traces.map((t, i) => ({
      type: 'scatter',
      mode: 'lines',
      x: t.x,
      y: t.y,
      name: t.name,
      connectgaps: false,
      line: { color: t.color ?? ['#b8336a', '#2b6cb0', '#8a6d00'][i % 3], width: 1.6, dash: t.dash ?? 'solid' },
      hovertemplate: '%{x:.0f} cm⁻¹<br>%{y:.2f}<extra>' + t.name.replace(/</g, '') + '</extra>',
    }));
    const kinds = [...new Set(markers.map((m) => m.kind))];
    for (const k of kinds) {
      const ms = markers.filter((m) => m.kind === k);
      const st = MARKER_STYLE[k];
      data.push({
        type: 'scatter',
        mode: showLabels && (k === 'assigned' || k === 'confirmed' || k === 'user') ? 'markers+text' : 'markers',
        x: ms.map((m) => m.x),
        y: ms.map((m) => m.y),
        text: ms.map((m) => m.label ?? ''),
        textposition: signal === 'transmittance' ? 'bottom center' : 'top center',
        textfont: { size: narrow ? 9 : 11, color: '#2f2a2e', family: 'Atkinson Hyperlegible, sans-serif' },
        hovertext: ms.map((m) => m.hover ?? `${Math.round(m.x)} cm⁻¹`),
        hoverinfo: 'text',
        name: st.name,
        marker: { color: st.color, symbol: st.symbol, size: st.size, line: { width: 1.2, color: st.color } },
        cliponaxis: false,
      });
    }
    const shapes = regions.map((r) => ({
      type: 'rect',
      xref: 'x',
      yref: 'paper',
      x0: r.from,
      x1: r.to,
      y0: 0,
      y1: 1,
      fillcolor: 'rgba(242, 201, 76, 0.22)',
      line: { width: 0 },
      layer: 'below',
    }));
    const annotations = showLabels
      ? regions.filter((r) => r.label).map((r) => ({ x: (r.from + r.to) / 2, y: 1, yref: 'paper', yanchor: 'bottom', text: r.label, showarrow: false, font: { size: narrow ? 9 : 11, color: '#5d5459' } }))
      : [];
    const layout: any = {
      margin: { l: narrow ? 44 : 58, r: 12, t: regions.some((r) => r.label) && showLabels ? 26 : 10, b: narrow ? 70 : 54 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      font: { family: 'Atkinson Hyperlegible, sans-serif', color: '#2f2a2e', size: narrow ? 11 : 12 },
      xaxis: {
        title: { text: 'Número de onda (cm⁻¹)' },
        autorange: xRange ? false : 'reversed',
        range: xRange ? [xRange[1], xRange[0]] : undefined,
        gridcolor: '#f3e6ea',
        zeroline: false,
        ticks: 'outside',
      },
      yaxis: { title: { text: yLabel }, gridcolor: '#f3e6ea', zeroline: false, ticks: 'outside', fixedrange: false },
      legend: { orientation: 'h', y: narrow ? -0.32 : -0.2, font: { size: narrow ? 10 : 11 } },
      showlegend: data.length > 1,
      // con un manejador de clic, cualquier punto de la vertical selecciona el dato más cercano en X
      hovermode: onClickX ? 'x' : 'closest',
      dragmode: 'zoom',
      shapes,
      annotations,
    };
    const config = {
      responsive: true,
      displaylogo: false,
      scrollZoom: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'toggleSpikelines'],
      locale: 'es',
    };
    P.react(el.current, data, layout, config).catch((e: Error) => setError(`Error al dibujar: ${e.message}`));
    const node = el.current as any;
    if (onClickX && node.on) {
      node.removeAllListeners?.('plotly_click');
      node.on('plotly_click', (ev: any) => {
        const p = ev?.points?.[0];
        if (p) onClickX(p.x, p.y ?? null);
      });
    }
  }, [ready, traces, markers, regions, signal, yLabel, showLabels, xRange, onClickX, narrow]);

  useEffect(() => {
    const onR = () => el.current && plotly.current?.Plots.resize(el.current);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const reset = () => {
    if (el.current && plotly.current) plotly.current.relayout(el.current, { 'xaxis.autorange': xRange ? false : 'reversed', 'xaxis.range': xRange ? [xRange[1], xRange[0]] : undefined, 'yaxis.autorange': true });
  };
  const png = () => {
    if (el.current && plotly.current) plotly.current.downloadImage(el.current, { format: 'png', filename: fileName, width: 1400, height: 700 });
  };

  return (
    <div className="plot-shell">
      <div className="plot-toolbar">
        {toolbar}
        <span className="spacer" />
        <button type="button" className="btn small quiet" onClick={reset}>
          Restablecer vista
        </button>
        <button type="button" className="btn small quiet" onClick={png}>
          Descargar PNG
        </button>
      </div>
      {error ? (
        <div className="alert error" role="alert">
          {error}
        </div>
      ) : (
        <div ref={el} className="plot-area" style={height ? { height } : undefined} role="img" aria-label={ariaLabel}>
          {!ready && <div className="plot-loading">Cargando gráfico…</div>}
        </div>
      )}
      <p className="small muted" style={{ margin: '4px 8px 2px' }}>
        Arrastre para ampliar una región; doble clic o «Restablecer vista» para volver. Pase el cursor (o toque) para leer las coordenadas.
      </p>
    </div>
  );
}
