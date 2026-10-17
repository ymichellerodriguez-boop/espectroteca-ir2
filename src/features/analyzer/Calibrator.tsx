import { useEffect, useMemo, useRef, useState } from 'react';
import { darkMask, detectSdbsFrame, imageDataFrom, traceCurve, type Calibration } from '../../services/imageDigitize';
import type { SignalKind } from '../../lib/types';

type PointKey = 'xa' | 'xb' | 'xc' | 'ya' | 'yb' | 'r1' | 'r2';
const POINT_LABEL: Record<PointKey, string> = {
  xa: 'Marca X izquierda',
  xb: 'Marca X intermedia (cambio de escala)',
  xc: 'Marca X derecha',
  ya: 'Marca Y superior',
  yb: 'Marca Y inferior',
  r1: 'Esquina del recuadro',
  r2: 'Esquina opuesta del recuadro',
};

export interface DigitizedResult {
  x: number[];
  y: number[];
  signal: SignalKind;
  yLabel: string;
  operations: string[];
  warnings: string[];
}

interface Props {
  src: string;
  sourceName: string;
  onDone: (r: DigitizedResult) => void;
}

/**
 * Calibración manual de los ejes sobre una imagen y extracción del trazo.
 * El usuario marca dos (o tres) posiciones del eje X y dos del eje Y con sus valores.
 */
export default function Calibrator({ src, sourceName, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imData, setImData] = useState<ImageData | null>(null);
  const [pts, setPts] = useState<Partial<Record<PointKey, { x: number; y: number }>>>({});
  const [vals, setVals] = useState({ xa: 4000, xb: 2000, xc: 400, ya: 100, yb: 0 });
  const [piecewise, setPiecewise] = useState(false);
  const [armed, setArmed] = useState<PointKey | null>('xa');
  const [threshold, setThreshold] = useState(120);
  const [signal, setSignal] = useState<SignalKind>('transmittance');
  const [preview, setPreview] = useState<{ x: number[]; y: number[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const i = new Image();
    i.onload = () => {
      setImg(i);
      setImData(imageDataFrom(i, i.naturalWidth, i.naturalHeight));
    };
    i.onerror = () => setMsg('No se pudo abrir la imagen.');
    i.src = src;
    setPts({});
    setPreview(null);
  }, [src]);

  const cal: Calibration | null = useMemo(() => {
    const need: PointKey[] = piecewise ? ['xa', 'xb', 'xc', 'ya', 'yb'] : ['xa', 'xc', 'ya', 'yb'];
    if (!need.every((k) => pts[k])) return null;
    const xPoints = [{ px: pts.xa!.x, value: vals.xa }, ...(piecewise ? [{ px: pts.xb!.x, value: vals.xb }] : []), { px: pts.xc!.x, value: vals.xc }];
    const yPoints = [
      { py: pts.ya!.y, value: vals.ya },
      { py: pts.yb!.y, value: vals.yb },
    ];
    const roi = pts.r1 && pts.r2
      ? { x0: Math.min(pts.r1.x, pts.r2.x), x1: Math.max(pts.r1.x, pts.r2.x), y0: Math.min(pts.r1.y, pts.r2.y), y1: Math.max(pts.r1.y, pts.r2.y) }
      : { x0: Math.min(pts.xa!.x, pts.xc!.x) + 2, x1: Math.max(pts.xa!.x, pts.xc!.x) - 2, y0: Math.min(pts.ya!.y, pts.yb!.y) + 2, y1: Math.max(pts.ya!.y, pts.yb!.y) - 2 };
    return { xPoints, yPoints, roi };
  }, [pts, vals, piecewise]);

  // dibujo
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img) return;
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const lw = Math.max(1.5, img.naturalWidth / 500);
    if (cal) {
      ctx.strokeStyle = 'rgba(242,201,76,0.95)';
      ctx.lineWidth = lw;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cal.roi.x0, cal.roi.y0, cal.roi.x1 - cal.roi.x0, cal.roi.y1 - cal.roi.y0);
      ctx.setLineDash([]);
    }
    (Object.keys(pts) as PointKey[]).forEach((k) => {
      const p = pts[k]!;
      ctx.strokeStyle = k.startsWith('x') ? '#2b6cb0' : k.startsWith('y') ? '#2f7d4f' : '#8a6d00';
      ctx.lineWidth = lw;
      ctx.beginPath();
      if (k.startsWith('x')) {
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, c.height);
      } else if (k.startsWith('y')) {
        ctx.moveTo(0, p.y);
        ctx.lineTo(c.width, p.y);
      } else {
        ctx.arc(p.x, p.y, lw * 4, 0, Math.PI * 2);
      }
      ctx.stroke();
    });
    if (preview && cal) {
      ctx.strokeStyle = '#b8336a';
      ctx.lineWidth = lw;
      ctx.beginPath();
      // reproyección del resultado sobre la imagen para comprobarlo visualmente
      const xp = cal.xPoints.slice().sort((a, b) => a.px - b.px);
      const toPx = (wn: number) => {
        for (let i = 0; i < xp.length - 1; i++) {
          const a = xp[i];
          const b = xp[i + 1];
          const lo = Math.min(a.value, b.value);
          const hi = Math.max(a.value, b.value);
          if (wn >= lo && wn <= hi) return a.px + ((wn - a.value) / (b.value - a.value)) * (b.px - a.px);
        }
        return NaN;
      };
      const [ya, yb] = cal.yPoints;
      const toPy = (v: number) => ya.py + ((v - ya.value) / (yb.value - ya.value)) * (yb.py - ya.py);
      let pen = false;
      preview.x.forEach((wn, i) => {
        const v = preview.y[i];
        if (!Number.isFinite(v)) { pen = false; return; }
        const X = toPx(wn);
        const Y = toPy(v);
        if (pen) ctx.lineTo(X, Y);
        else ctx.moveTo(X, Y);
        pen = true;
      });
      ctx.stroke();
    }
  }, [img, pts, cal, preview]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!armed || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvasRef.current.width;
    const y = ((e.clientY - r.top) / r.height) * canvasRef.current.height;
    setPts((p) => ({ ...p, [armed]: { x, y } }));
    setPreview(null);
    const order: PointKey[] = piecewise ? ['xa', 'xb', 'xc', 'ya', 'yb'] : ['xa', 'xc', 'ya', 'yb'];
    const next = order[order.indexOf(armed) + 1];
    setArmed(next ?? null);
  };

  const autoSdbs = () => {
    if (!imData) return;
    const c = detectSdbsFrame(imData);
    if (!c) {
      setMsg('No se reconoce el marco de una impresión de SDBS. Calibre los ejes manualmente.');
      return;
    }
    setPiecewise(true);
    setVals({ xa: 4000, xb: 2000, xc: 400, ya: 100, yb: 0 });
    setPts({
      xa: { x: c.xPoints[0].px, y: 0 },
      xb: { x: c.xPoints[1].px, y: 0 },
      xc: { x: c.xPoints[2].px, y: 0 },
      ya: { x: 0, y: c.yPoints[0].py },
      yb: { x: 0, y: c.yPoints[1].py },
      r1: { x: c.roi.x0, y: c.roi.y0 },
      r2: { x: c.roi.x1, y: c.roi.y1 },
    });
    setSignal('transmittance');
    setMsg('Marco SDBS detectado: 4000–2000 y 2000–400 cm⁻¹ (escala a tramos), 100 %T arriba y 0 %T abajo. Compruebe las líneas sobre la imagen.');
  };

  const extract = () => {
    if (!cal || !imData) return;
    const mask = darkMask(imData, { threshold });
    const r = traceCurve(mask, imData.width, cal, signal === 'transmittance' ? 'bottom' : signal === 'absorbance' ? 'top' : 'center');
    const valid = r.y.filter(Number.isFinite).length;
    if (valid < 30) {
      setMsg(`Sólo se encontraron ${valid} columnas con trazo. Ajuste el umbral de oscuridad o el recuadro.`);
      return;
    }
    setPreview({ x: r.x, y: r.y });
    setMsg(`Trazo encontrado en ${valid} de ${r.columns} columnas. Compruebe la línea rosa sobre la imagen y pulse «Usar esta curva».`);
  };

  const accept = () => {
    if (!preview || !cal) return;
    const stepX = Math.abs(cal.xPoints[0].value - cal.xPoints[cal.xPoints.length - 1].value) / Math.max(1, Math.abs(cal.roi.x1 - cal.roi.x0));
    onDone({
      x: preview.x,
      y: preview.y,
      signal,
      yLabel: signal === 'transmittance' ? 'Transmitancia (según calibración)' : signal === 'absorbance' ? 'Absorbancia (según calibración)' : 'Señal (según calibración)',
      operations: [
        `Curva digitalizada de la imagen «${sourceName}» (${imData!.width}×${imData!.height} px)`,
        `Calibración X: ${cal.xPoints.map((p) => `${Math.round(p.px)} px → ${p.value} cm⁻¹`).join('; ')}${piecewise ? ' (escala a tramos)' : ''}`,
        `Calibración Y: ${cal.yPoints.map((p) => `${Math.round(p.py)} px → ${p.value}`).join('; ')}`,
        `Umbral de oscuridad ${threshold}/255; resolución aproximada ${stepX.toFixed(1)} cm⁻¹ por píxel`,
      ],
      warnings: ['Datos estimados a partir de una imagen: la precisión depende de la resolución y de la calibración. No equivalen a un archivo numérico original.'],
    });
  };

  const order: PointKey[] = piecewise ? ['xa', 'xb', 'xc', 'ya', 'yb', 'r1', 'r2'] : ['xa', 'xc', 'ya', 'yb', 'r1', 'r2'];
  return (
    <div className="calibrator">
      <div className="calib-grid">
        <div>
          <canvas ref={canvasRef} onClick={onCanvasClick} className={`calib-canvas ${armed ? 'armed' : ''}`} aria-label="Imagen del espectro para calibrar los ejes" />
          <p className="small muted">
            {armed ? (
              <>
                Toque la imagen para colocar: <strong>{POINT_LABEL[armed]}</strong>
              </>
            ) : (
              'Todas las marcas colocadas. Puede reajustar cualquiera con su botón.'
            )}
          </p>
        </div>
        <div className="stack">
          <button type="button" className="btn secondary" onClick={autoSdbs} disabled={!imData}>
            Detectar marco SDBS automáticamente
          </button>
          <label className="check">
            <input type="checkbox" checked={piecewise} onChange={(e) => setPiecewise(e.target.checked)} /> El eje X cambia de escala (p. ej. en 2000 cm⁻¹)
          </label>
          <div className="calib-points">
            {order.map((k) => (
              <div key={k} className="calib-pt">
                <button type="button" className={`btn small ${armed === k ? '' : 'quiet'}`} onClick={() => setArmed(k)}>
                  {pts[k] ? '✓ ' : ''}
                  {POINT_LABEL[k]}
                </button>
                {k in vals && (
                  <input
                    aria-label={`Valor de ${POINT_LABEL[k]}`}
                    type="number"
                    value={vals[k as keyof typeof vals]}
                    onChange={(e) => setVals((v) => ({ ...v, [k]: Number(e.target.value) }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="sig">La señal representada es</label>
            <select id="sig" value={signal} onChange={(e) => setSignal(e.target.value as SignalKind)}>
              <option value="transmittance">transmitancia (bandas hacia abajo)</option>
              <option value="absorbance">absorbancia (bandas hacia arriba)</option>
              <option value="other">otra / no sé</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="thr">
              Umbral de oscuridad del trazo: {threshold} <small>(más alto = acepta trazos más claros)</small>
            </label>
            <input id="thr" type="range" min={40} max={230} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn" onClick={extract} disabled={!cal}>
              Extraer curva
            </button>
            <button type="button" className="btn" onClick={accept} disabled={!preview}>
              Usar esta curva
            </button>
          </div>
          {msg && <div className="alert info small">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
