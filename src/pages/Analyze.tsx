import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AssignmentEditor, { type EditableAssignment } from '../components/AssignmentEditor';
import SpectrumPlot, { type PlotMarker } from '../components/SpectrumPlot';
import Calibrator, { type DigitizedResult } from '../features/analyzer/Calibrator';
import { proposeForUnknown } from '../features/analyzer/propose';
import { convertJcampText, type ConversionReport } from '../lib/jcamp/convert';
import { classifyY } from '../lib/jcamp/normalize';
import { detectPeaks, type DetectedPeak } from '../lib/peaks';
import { parseDelimited, parseSpectrumJson, type TableParse } from '../lib/tabular';
import type { SignalKind, SpectrumData } from '../lib/types';
import { validateSpectrum, type ValidationReport } from '../lib/validate';
import { downloadCsv, downloadJson, safeName } from '../services/export';
import { ACCEPT, MAX_BYTES, detectKind, docxImages, pdfPageImage, readText, type FileKind } from '../services/fileLoaders';
import { setUserSpectrum } from '../services/userSpectrum';

const KIND_LABEL: Record<FileKind, string> = {
  jcamp: 'JCAMP-DX',
  csv: 'CSV',
  txt: 'texto con columnas (TXT)',
  json: 'JSON',
  image: 'imagen',
  pdf: 'PDF',
  docx: 'documento Word (DOCX)',
  desconocido: 'desconocido',
};

interface Loaded {
  spectrum: SpectrumData;
  operations: string[];
  warnings: string[];
  origin: string;
  meta?: Record<string, unknown>;
}

function Step({ n, title, done, children, active }: { n: number; title: string; done?: boolean; active?: boolean; children?: React.ReactNode }) {
  return (
    <section className={`step ${done ? 'done' : ''} ${active ? 'active' : ''}`} aria-labelledby={`st${n}`}>
      <div className="step-num" aria-hidden="true">
        {done ? '✓' : n}
      </div>
      <div className="step-body">
        <h2 id={`st${n}`}>
          <span className="visually-hidden">Paso {n}: </span>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

export default function Analyze() {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<FileKind | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jcamp, setJcamp] = useState<ConversionReport | null>(null);
  const [table, setTable] = useState<TableParse | null>(null);
  const [jsonXY, setJsonXY] = useState<{ x: number[]; y: number[] } | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [docxList, setDocxList] = useState<{ name: string; url: string; caption: string }[] | null>(null);
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // opciones para datos tabulares
  const [xCol, setXCol] = useState(0);
  const [yCol, setYCol] = useState(1);
  const [xUnit, setXUnit] = useState<'cm-1' | 'um' | 'nm'>('cm-1');
  const [yKind, setYKind] = useState<'T%' | 'Tfrac' | 'A' | 'other'>('T%');
  // detección
  const [prom, setProm] = useState(3);
  const [smooth, setSmooth] = useState(0);
  const [minDist, setMinDist] = useState(8);
  const [items, setItems] = useState<EditableAssignment[]>([]);
  const [userMarks, setUserMarks] = useState<number[]>([]);

  const reset = () => {
    setKind(null);
    setError(null);
    setJcamp(null);
    setTable(null);
    setJsonXY(null);
    setImageSrc(null);
    setDocxList(null);
    setLoaded(null);
    setItems([]);
    setUserMarks([]);
  };

  const onFile = async (f: File) => {
    reset();
    setFile(f);
    if (f.size > MAX_BYTES) {
      setError(`El archivo pesa ${(f.size / 1e6).toFixed(1)} MB; el máximo es ${MAX_BYTES / 1e6} MB.`);
      return;
    }
    try {
      setBusy('Reconociendo el formato…');
      const k = await detectKind(f);
      setKind(k);
      if (k === 'desconocido') throw new Error('No se reconoce el formato. Use JCAMP-DX (.jdx/.dx), CSV, TXT, JSON, PNG, JPG, PDF o DOCX.');
      if (k === 'jcamp') {
        setBusy('Decodificando JCAMP-DX…');
        const rep = convertJcampText(await readText(f), f.name);
        setJcamp(rep);
        if (rep.spectra.length === 1 && rep.spectra[0].validation.ok) applyJcamp(rep, 0, f.name);
        if (!rep.spectra.length) setError(rep.errors.join(' ') || 'El archivo no contiene una curva compatible.');
      } else if (k === 'csv' || k === 'txt') {
        setBusy('Leyendo columnas…');
        const t = parseDelimited(await readText(f));
        if (t.rows.length < 3) throw new Error('No se encontraron filas numéricas suficientes. Compruebe que el archivo tenga al menos dos columnas de números.');
        setTable(t);
        setXCol(0);
        setYCol(Math.min(1, t.columns.length - 1));
      } else if (k === 'json') {
        const j = parseSpectrumJson(await readText(f));
        setJsonXY({ x: j.x, y: j.y });
      } else if (k === 'image') {
        setImageSrc(URL.createObjectURL(f));
      } else if (k === 'pdf') {
        setBusy('Renderizando la primera página del PDF…');
        const r = await pdfPageImage(f, 1);
        setPdfPages(r.pages);
        setPdfPage(1);
        setImageSrc(r.url);
      } else if (k === 'docx') {
        setBusy('Buscando imágenes en el documento…');
        const imgs = await docxImages(f);
        if (!imgs.length) throw new Error('El documento no contiene imágenes. Si el espectro está como tabla, cópiela a un CSV.');
        setDocxList(imgs);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const applyJcamp = (rep: ConversionReport, i: number, name: string) => {
    const s = rep.spectra[i];
    setLoaded({ spectrum: s.spectrum, operations: [`Archivo JCAMP-DX ${name} (${s.encodings.join('+')}, ${s.validation.nPoints} puntos)`, ...s.operations], warnings: [...rep.warnings, ...s.warnings], origin: 'JCAMP-DX', meta: { title: s.title, ...s.meta, checks: s.checks } });
  };

  const buildFromXY = (x0: number[], y0: number[], origin: string) => {
    const ops: string[] = [];
    let x = x0.slice();
    let y = y0.slice();
    if (xUnit === 'um') {
      x = x.map((v) => 1e4 / v);
      ops.push('X convertida de µm a cm⁻¹ (ṽ = 10⁴ / λ)');
    } else if (xUnit === 'nm') {
      x = x.map((v) => 1e7 / v);
      ops.push('X convertida de nm a cm⁻¹ (ṽ = 10⁷ / λ)');
    }
    const ord = x.map((_, i) => i).filter((i) => Number.isFinite(x[i])).sort((a, b) => x[a] - x[b]);
    const X: number[] = [];
    const Y: number[] = [];
    for (const i of ord) {
      if (X.length && x[i] === X[X.length - 1]) continue;
      X.push(x[i]);
      Y.push(y[i]);
    }
    if (X.length !== x.length) ops.push(`Puntos ordenados por número de onda (${x.length - X.length} duplicados o inválidos descartados)`);
    const signal: SignalKind = yKind === 'A' ? 'absorbance' : yKind === 'other' ? 'other' : 'transmittance';
    const yUnits = yKind === 'T%' ? 'TRANSMITTANCE' : yKind === 'Tfrac' ? 'TRANSMITTANCE' : yKind === 'A' ? 'ABSORBANCE' : '';
    const cls = classifyY(yUnits, Y);
    setLoaded({
      spectrum: { x: X, y: Y, xUnits: 'cm-1', yUnits, yLabel: yKind === 'other' ? 'Señal' : cls.label, signal, yScale: yKind === 'T%' ? 'percent' : yKind === 'Tfrac' ? 'fraction' : 'arbitrary' },
      operations: [origin, ...ops],
      warnings: [],
      origin,
    });
  };

  const onDigitized = (r: DigitizedResult) => {
    setLoaded({ spectrum: { x: r.x, y: r.y, xUnits: 'cm-1', yUnits: r.signal === 'transmittance' ? 'TRANSMITTANCE' : r.signal === 'absorbance' ? 'ABSORBANCE' : '', yLabel: r.yLabel, signal: r.signal, yScale: 'arbitrary' }, operations: r.operations, warnings: r.warnings, origin: 'imagen digitalizada' });
  };

  const validation: ValidationReport | null = useMemo(() => (loaded ? validateSpectrum(loaded.spectrum) : null), [loaded]);
  const peaks: DetectedPeak[] = useMemo(
    () => (loaded && validation?.ok ? detectPeaks(loaded.spectrum.x, loaded.spectrum.y, loaded.spectrum.signal, { minProminence: prom / 100, smoothing: smooth, minDistance: minDist }) : []),
    [loaded, validation, prom, smooth, minDist],
  );
  const proposal = useMemo(() => proposeForUnknown(peaks), [peaks]);
  useEffect(() => {
    setItems(proposal.assignments as EditableAssignment[]);
  }, [proposal]);
  useEffect(() => {
    if (loaded && validation?.ok) setUserSpectrum({ name: file?.name ?? 'Mi espectro', spectrum: loaded.spectrum, origin: loaded.origin });
  }, [loaded, validation, file]);

  const setSignal = (s: SignalKind) => loaded && setLoaded({ ...loaded, spectrum: { ...loaded.spectrum, signal: s }, operations: [...loaded.operations.filter((o) => !o.startsWith('Tipo de señal')), `Tipo de señal indicado por el usuario: ${s} (sin transformar los datos)`] });

  const markers: PlotMarker[] = useMemo(
    () => [
      ...peaks.map((p) => ({ x: p.x, y: p.y, kind: 'detected' as const, hover: `Pico detectado: ${Math.round(p.x)} cm⁻¹ · ${p.intensity} · ${p.shape}` })),
      ...items.filter((a) => !a.removed).map((a) => ({ x: a.observed, y: a.observedY ?? 0, kind: a.level === 'confirmada' ? ('confirmed' as const) : ('assigned' as const), label: a.level === 'confirmada' || a.confidence !== 'baja' ? a.bond : undefined, hover: `${a.bond} · ${a.group}` })),
      ...userMarks.map((x) => ({ x, y: nearestY(loaded, x), kind: 'user' as const, label: `${Math.round(x)}` })),
    ],
    [peaks, items, userMarks, loaded],
  );
  const traces = useMemo(() => (loaded ? [{ x: loaded.spectrum.x, y: loaded.spectrum.y.map((v) => (Number.isFinite(v) ? v : null)), name: file?.name ?? 'Mi espectro' }] : []), [loaded, file]);
  const onPlotClick = useCallback((x: number) => setUserMarks((m) => (m.some((v) => Math.abs(v - x) < 3) ? m.filter((v) => Math.abs(v - x) >= 3) : [...m, x])), []);

  const exportAnalysis = () => {
    if (!loaded) return;
    downloadJson(`analisis_${safeName(file?.name ?? 'espectro')}.json`, {
      generadoPor: 'Espectroteca IR',
      fecha: new Date().toISOString(),
      archivo: file?.name,
      origen: loaded.origin,
      operaciones: loaded.operations,
      avisos: loaded.warnings,
      validacion: validation,
      ajustesDeteccion: { prominenciaMinimaPorcentaje: prom, suavizado: smooth, separacionMinimaCm: minDist },
      picosDetectados: peaks.map((p) => ({ cm1: +p.x.toFixed(1), señal: p.y, intensidad: p.intensity, forma: p.shape, anchuraCm: p.widthCm && +p.widthCm.toFixed(0) })),
      marcasDelUsuario: userMarks,
      hipotesis: proposal.hypotheses,
      asignaciones: items.filter((a) => !a.removed),
      advertencia: 'Las asignaciones son propuestas a partir de intervalos orientativos; la detección automática no identifica el compuesto.',
      espectro: { x: loaded.spectrum.x, y: loaded.spectrum.y.map((v) => (Number.isFinite(v) ? v : null)), xUnits: loaded.spectrum.xUnits, yLabel: loaded.spectrum.yLabel, signal: loaded.spectrum.signal },
    });
  };

  const stage = loaded ? 4 : kind ? 2 : 1;
  return (
    <div className="wrap analyze">
      <div className="page-head">
        <h1>Analizar mi espectro</h1>
        <p>Todo el análisis ocurre en su navegador: el archivo no se envía a ningún servidor ni a una IA.</p>
      </div>

      <Step n={1} title="Cargar el archivo" done={!!file} active={stage === 1}>
        <label
          className="drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
        >
          <input type="file" accept={ACCEPT} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <strong>{file ? file.name : 'Elija o arrastre un archivo'}</strong>
          <span className="small muted">JCAMP-DX, CSV, TXT, JSON, PNG, JPG, PDF o DOCX · máximo 25 MB</span>
        </label>
        {busy && (
          <p className="small" role="status">
            {busy}
          </p>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
      </Step>

      {kind && kind !== 'desconocido' && (
        <Step n={2} title="Reconocer el formato" done>
          <p>
            Formato reconocido: <strong>{KIND_LABEL[kind]}</strong>.{' '}
            {kind === 'image' || kind === 'pdf' || kind === 'docx' ? 'Los datos se estimarán a partir de la imagen tras calibrar los ejes.' : 'Los datos numéricos se leerán directamente.'}
          </p>
        </Step>
      )}

      {kind && kind !== 'desconocido' && (
        <Step n={3} title="Extraer o decodificar el espectro" done={!!loaded} active={!loaded}>
          {jcamp && (
            <div className="stack">
              {jcamp.errors.length > 0 && (
                <div className="alert error">
                  <strong>Problemas al decodificar</strong>
                  <ul>{jcamp.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              {jcamp.peakTablesOnly.length > 0 && !jcamp.spectra.length && (
                <div className="alert warn">El archivo sólo contiene una tabla de picos ({jcamp.peakTablesOnly[0].x.length} picos), sin curva: no puede dibujarse como espectro continuo.</div>
              )}
              {jcamp.spectra.length > 1 && (
                <div className="field">
                  <label htmlFor="blk">El archivo tiene {jcamp.spectra.length} espectros; elija uno</label>
                  <select id="blk" onChange={(e) => applyJcamp(jcamp, Number(e.target.value), file!.name)} defaultValue="">
                    <option value="" disabled>
                      Elegir…
                    </option>
                    {jcamp.spectra.map((s, i) => (
                      <option key={i} value={i}>
                        {s.title || `Bloque ${s.blockIndex + 1}`} ({s.validation.nPoints} puntos)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {jcamp.spectra[0] && (
                <div className="table-wrap">
                  <table className="data cards">
                    <tbody>
                      {(['title', 'jcampVersion', 'dataType', 'xUnits', 'yUnits', 'xFactor', 'yFactor', 'firstX', 'lastX', 'nPoints', 'deltaX', 'origin', 'owner'] as const).map((k) => {
                        const v = jcamp.spectra[0].meta[k];
                        return v === undefined ? null : (
                          <tr key={k}>
                            <td data-label="Etiqueta">{({ title: 'TITLE', jcampVersion: 'JCAMP-DX', dataType: 'DATA TYPE', xUnits: 'XUNITS', yUnits: 'YUNITS', xFactor: 'XFACTOR', yFactor: 'YFACTOR', firstX: 'FIRSTX', lastX: 'LASTX', nPoints: 'NPOINTS', deltaX: 'DELTAX', origin: 'ORIGIN', owner: 'OWNER' })[k]}</td>
                            <td data-label="Valor">{String(v)}</td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td data-label="Etiqueta">Codificación</td>
                        <td data-label="Valor">{jcamp.spectra[0].dataKind} · {jcamp.spectra[0].encodings.join(', ')}</td>
                      </tr>
                      <tr>
                        <td data-label="Etiqueta">Comprobaciones</td>
                        <td data-label="Valor">
                          {jcamp.spectra[0].checks.nPointsDecoded} puntos decodificados
                          {jcamp.spectra[0].checks.nPointsMatch === false ? ' (no coincide con NPOINTS)' : jcamp.spectra[0].checks.nPointsMatch ? ' (coincide con NPOINTS)' : ''}; control de ordenada: {jcamp.spectra[0].checks.yCheckCount - jcamp.spectra[0].checks.yCheckFailures}/{jcamp.spectra[0].checks.yCheckCount} correctos
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {(table || jsonXY) && (
            <div className="stack">
              {table && (
                <>
                  <p className="small muted">
                    {table.rows.length} filas · separador «{table.delimiter === '\t' ? 'tabulador' : table.delimiter === ' ' ? 'espacio' : table.delimiter}»{table.decimalComma ? ' · coma decimal' : ''}
                    {table.skippedLines ? ` · ${table.skippedLines} líneas no numéricas omitidas` : ''}
                  </p>
                  <div className="row">
                    <div className="field" style={{ flex: 1, minWidth: 160 }}>
                      <label htmlFor="xc">Columna del número de onda</label>
                      <select id="xc" value={xCol} onChange={(e) => setXCol(Number(e.target.value))}>
                        {table.columns.map((c, i) => <option key={i} value={i}>{c}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{ flex: 1, minWidth: 160 }}>
                      <label htmlFor="yc">Columna de la señal</label>
                      <select id="yc" value={yCol} onChange={(e) => setYCol(Number(e.target.value))}>
                        {table.columns.map((c, i) => <option key={i} value={i}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div className="row">
                <div className="field" style={{ flex: 1, minWidth: 160 }}>
                  <label htmlFor="xu">Unidades del eje X</label>
                  <select id="xu" value={xUnit} onChange={(e) => setXUnit(e.target.value as 'cm-1')}>
                    <option value="cm-1">cm⁻¹ (número de onda)</option>
                    <option value="um">µm (longitud de onda)</option>
                    <option value="nm">nm (longitud de onda)</option>
                  </select>
                </div>
                <div className="field" style={{ flex: 1, minWidth: 160 }}>
                  <label htmlFor="yu">La señal es</label>
                  <select id="yu" value={yKind} onChange={(e) => setYKind(e.target.value as 'T%')}>
                    <option value="T%">transmitancia en %</option>
                    <option value="Tfrac">transmitancia en fracción (0–1)</option>
                    <option value="A">absorbancia</option>
                    <option value="other">otra / no sé</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  table
                    ? buildFromXY(table.rows.map((r) => r[xCol]), table.rows.map((r) => r[yCol] ?? NaN), `Archivo ${KIND_LABEL[kind!]} ${file!.name}: columnas «${table.columns[xCol]}» y «${table.columns[yCol]}»`)
                    : buildFromXY(jsonXY!.x, jsonXY!.y, `Archivo JSON ${file!.name}`)
                }
              >
                Leer el espectro
              </button>
            </div>
          )}

          {docxList && !imageSrc && (
            <div>
              <p>Elija la imagen del espectro ({docxList.length} encontradas):</p>
              <ul className="docx-grid">
                {docxList.map((d) => (
                  <li key={d.name}>
                    <button type="button" onClick={() => setImageSrc(d.url)}>
                      <img src={d.url} alt={`Imagen ${d.name}`} loading="lazy" />
                      <span className="small">{d.caption || d.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {kind === 'pdf' && pdfPages > 1 && (
            <div className="row">
              <label htmlFor="pg">Página</label>
              <input id="pg" type="number" min={1} max={pdfPages} value={pdfPage} onChange={async (e) => {
                const p = Number(e.target.value);
                setPdfPage(p);
                setImageSrc((await pdfPageImage(file!, p)).url);
              }} style={{ maxWidth: 90 }} />
              <span className="muted small">de {pdfPages}</span>
            </div>
          )}
          {imageSrc && !loaded && (
            <>
              {docxList && (
                <button type="button" className="btn small quiet" onClick={() => setImageSrc(null)}>
                  Elegir otra imagen
                </button>
              )}
              <Calibrator src={imageSrc} sourceName={file?.name ?? 'imagen'} onDone={onDigitized} />
            </>
          )}
          {loaded && (
            <p>
              Espectro listo: {loaded.spectrum.x.length} puntos.{' '}
              <button type="button" className="btn small quiet" onClick={() => setLoaded(null)}>
                Cambiar la extracción
              </button>
            </p>
          )}
        </Step>
      )}

      {loaded && validation && (
        <>
          <Step n={4} title="Ver la gráfica y verificar los ejes" done={validation.ok}>
            <div className="row">
              <span>
                Eje X: <strong>{validation.xMin.toFixed(0)}–{validation.xMax.toFixed(0)} {loaded.spectrum.xUnits === 'cm-1' ? 'cm⁻¹' : loaded.spectrum.xUnits}</strong>
              </span>
              <span>
                Eje Y: <strong>{loaded.spectrum.yLabel}</strong> ({validation.yMin.toFixed(3)} a {validation.yMax.toFixed(3)})
              </span>
              <label className="row small" style={{ gap: 6 }}>
                Tipo de señal
                <select value={loaded.spectrum.signal} onChange={(e) => setSignal(e.target.value as SignalKind)} style={{ width: 'auto' }}>
                  <option value="transmittance">transmitancia (bandas hacia abajo)</option>
                  <option value="absorbance">absorbancia (bandas hacia arriba)</option>
                  <option value="other">otra</option>
                </select>
              </label>
            </div>
            {(validation.issues.length > 0 || loaded.warnings.length > 0) && (
              <div className={`alert ${validation.ok ? 'warn' : 'error'} small`}>
                <ul>
                  {validation.issues.map((i, k) => <li key={k}>{i.message}</li>)}
                  {loaded.warnings.map((w, k) => <li key={`w${k}`}>{w}</li>)}
                </ul>
              </div>
            )}
            {validation.ok ? (
              <SpectrumPlot traces={traces} markers={markers} signal={loaded.spectrum.signal} yLabel={loaded.spectrum.yLabel} fileName={`analisis_${safeName(file?.name ?? 'espectro')}`} onClickX={onPlotClick} ariaLabel="Espectro cargado por el usuario" />
            ) : (
              <p>Corrija los problemas indicados (otra columna, otras unidades u otro archivo) para continuar.</p>
            )}
            <details className="acc">
              <summary>Operaciones aplicadas a los datos</summary>
              <div className="acc-body small">
                <ul>{loaded.operations.map((o, i) => <li key={i}>{o}</li>)}</ul>
                <p className="muted">No se convierte transmitancia en absorbancia ni al revés: los datos se muestran como se leyeron.</p>
              </div>
            </details>
          </Step>

          {validation.ok && (
            <>
              <Step n={5} title="Detectar las bandas" done={peaks.length > 0}>
                <div className="detect-controls">
                  <div className="field">
                    <label htmlFor="pr">Sensibilidad: prominencia mínima {prom} % <small>(menor = más picos)</small></label>
                    <input id="pr" type="range" min={0.5} max={15} step={0.5} value={prom} onChange={(e) => setProm(Number(e.target.value))} />
                  </div>
                  <div className="field">
                    <label htmlFor="sm">Suavizado (Savitzky–Golay)</label>
                    <select id="sm" value={smooth} onChange={(e) => setSmooth(Number(e.target.value))}>
                      <option value={0}>sin suavizado</option>
                      <option value={5}>ligero (5 puntos)</option>
                      <option value={11}>medio (11 puntos)</option>
                      <option value={21}>fuerte (21 puntos)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="md">Separación mínima entre picos: {minDist} cm⁻¹</label>
                    <input id="md" type="range" min={2} max={60} value={minDist} onChange={(e) => setMinDist(Number(e.target.value))} />
                  </div>
                </div>
                <p className="small">
                  {peaks.length} picos detectados matemáticamente{loaded.spectrum.signal === 'transmittance' ? ' (mínimos de transmitancia)' : ' (máximos)'}. Toque la gráfica para marcar o desmarcar una posición propia. El suavizado sólo afecta a la detección: la curva mostrada son los datos originales.
                </p>
              </Step>

              <Step n={6} title="Proponer asignaciones químicas" done={proposal.hypotheses.length > 0}>
                {proposal.hypotheses.length === 0 ? (
                  <p>No hay evidencia suficiente para proponer grupos funcionales con estos ajustes. Pruebe a aumentar la sensibilidad o revise el tipo de señal.</p>
                ) : (
                  <ul className="hyp-list">
                    {proposal.hypotheses.map((h) => (
                      <li key={h.group} className="panel">
                        <div className="row">
                          <h3 style={{ margin: 0 }}>{h.label}</h3>
                          <span className={`small conf-${h.confidence}`}>confianza {h.confidence}</span>
                        </div>
                        <p className="small"><strong>A favor:</strong> {h.evidence.join('; ')}.</p>
                        {h.missing.length > 0 && <p className="small"><strong>Falta confirmar:</strong> {h.missing.join('; ')}.</p>}
                        {h.against.length > 0 && <p className="small"><strong>Precaución:</strong> {h.against.join('; ')}.</p>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="small muted">Son hipótesis compatibles con las bandas, no una identificación del compuesto. Compare con espectros de referencia antes de concluir.</p>
              </Step>

              <Step n={7} title="Revisar y editar" done={items.some((a) => a.level === 'confirmada')}>
                <AssignmentEditor items={items} onChange={setItems} signalLabel={loaded.spectrum.signal === 'transmittance' ? '' : ''} />
              </Step>

              <Step n={8} title="Exportar el análisis">
                <div className="btn-row">
                  <button type="button" className="btn" onClick={exportAnalysis}>Descargar análisis (JSON)</button>
                  <button type="button" className="btn quiet" onClick={() => downloadCsv(`picos_${safeName(file?.name ?? 'espectro')}.csv`, peaks.map((p) => ({ numero_onda_cm1: +p.x.toFixed(1), senal: p.y, intensidad: p.intensity, forma: p.shape, anchura_cm1: p.widthCm ? +p.widthCm.toFixed(0) : '' })))}>
                    Picos (CSV)
                  </button>
                  <button type="button" className="btn quiet" onClick={() => downloadCsv(`asignaciones_${safeName(file?.name ?? 'espectro')}.csv`, items.filter((a) => !a.removed).map((a) => ({ numero_onda_cm1: Math.round(a.observed), enlace: a.bond, grupo: a.group, vibracion: a.vibration, intervalo: `${a.rangeMin}-${a.rangeMax}`, confianza: a.confidence, estado: a.level, nota: a.userNote ?? '' })))}>
                    Asignaciones (CSV)
                  </button>
                  <button type="button" className="btn quiet" onClick={() => downloadCsv(`datos_${safeName(file?.name ?? 'espectro')}.csv`, loaded.spectrum.x.map((x, i) => ({ numero_onda_cm1: x, senal: Number.isFinite(loaded.spectrum.y[i]) ? loaded.spectrum.y[i] : '' })))}>
                    Datos (CSV)
                  </button>
                  <Link className="btn secondary" to="/comparar?usuario=1">Comparar con la biblioteca</Link>
                </div>
                <p className="small muted">La imagen de la gráfica se descarga con el botón «Descargar PNG» del paso 4.</p>
              </Step>
            </>
          )}
        </>
      )}
    </div>
  );
}

function nearestY(l: Loaded | null, x: number): number {
  if (!l) return 0;
  const { x: xs, y } = l.spectrum;
  let b = 0;
  for (let i = 0; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[b] - x)) b = i;
  return Number.isFinite(y[b]) ? y[b] : 0;
}
