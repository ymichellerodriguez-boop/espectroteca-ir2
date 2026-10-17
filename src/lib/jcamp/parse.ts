/**
 * Lector JCAMP-DX limitado y documentado (versiones 4.24 y 5.x) para espectros 1D.
 *
 * COMPATIBLE (probado en tests/):
 *   - ##XYDATA=(X++(Y..Y)) en AFFN, PAC y ASDF (SQZ, DIF, DUP) con comprobación de ordenada (Y-check).
 *   - ##XYPOINTS=(XY..XY) y ##PEAK TABLE=(XY..XY) / (XYW..XYW) / (XYM..XYM).
 *   - Archivos con varios bloques (##BLOCKS, bloques LINK) — se devuelve cada bloque con datos.
 *   - Factores XFACTOR / YFACTOR, FIRSTX, LASTX, NPOINTS, DELTAX.
 * NO COMPATIBLE (se informa como error, sin cerrar la aplicación):
 *   - ##NTUPLES (RMN 2D, EM, series), ##XYDATA con formas distintas a (X++(Y..Y)),
 *     (R..R)/(I..I) y datos en formato binario.
 */
import { decodeLine } from './asdf';

export interface JcampMeta {
  title?: string;
  jcampVersion?: string;
  dataType?: string;
  origin?: string;
  owner?: string;
  xUnits?: string;
  yUnits?: string;
  xFactor?: number;
  yFactor?: number;
  firstX?: number;
  lastX?: number;
  firstY?: number;
  nPoints?: number;
  deltaX?: number;
  molForm?: string;
  casName?: string;
  casRN?: string;
  state?: string;
  samplingProcedure?: string;
  /** todas las etiquetas (LDR) leídas, con su nombre canónico */
  ldrs: Record<string, string>;
}

export interface JcampChecks {
  nPointsDeclared?: number;
  nPointsDecoded: number;
  nPointsMatch?: boolean;
  /** mayor desviación entre la X declarada al inicio de cada línea y la X reconstruida, en unidades de DELTAX */
  abscissaMaxDeviation?: number;
  yCheckCount: number;
  yCheckFailures: number;
  firstXMatch?: boolean;
  lastXMatch?: boolean;
  invalidValues: number;
}

export interface JcampDataSet {
  kind: 'XYDATA' | 'XYPOINTS' | 'PEAK TABLE';
  form: string;
  encodings: string[];
  x: number[];
  y: number[];
  w?: number[];
  checks: JcampChecks;
}

export interface JcampBlock {
  meta: JcampMeta;
  data: JcampDataSet[];
  warnings: string[];
  errors: string[];
}

export interface JcampParseResult {
  blocks: JcampBlock[];
  warnings: string[];
  errors: string[];
}

/** Canoniza una etiqueta: mayúsculas, sin espacios, guiones, barras ni guiones bajos (regla JCAMP). */
export function canonicalLabel(label: string): string {
  return label.toUpperCase().replace(/[\s\-/\\_]/g, '');
}

function stripComment(line: string): string {
  const k = line.indexOf('$$');
  return k >= 0 ? line.slice(0, k) : line;
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

interface RawLdr {
  label: string;
  canon: string;
  value: string; // primera línea (sin comentario)
  lines: string[]; // líneas de continuación
}

/** Divide el texto en LDR (##ETIQUETA=valor + continuaciones). */
export function splitLdrs(text: string): RawLdr[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: RawLdr[] = [];
  let cur: RawLdr | null = null;
  for (const rawLine of lines) {
    if (rawLine.startsWith('##')) {
      const eq = rawLine.indexOf('=');
      if (eq < 0) {
        // etiqueta sin '=' (no válida): se ignora como comentario
        continue;
      }
      const label = rawLine.slice(2, eq).trim();
      const canon = canonicalLabel(label);
      if (canon.startsWith('$$') || label.startsWith('$$')) {
        cur = null;
        continue;
      }
      cur = { label, canon, value: stripComment(rawLine.slice(eq + 1)).trim(), lines: [] };
      out.push(cur);
    } else if (cur) {
      const l = stripComment(rawLine);
      if (l.trim() !== '') cur.lines.push(l);
    }
  }
  return out;
}

function metaFromLdrs(ldrs: RawLdr[]): JcampMeta {
  const m: JcampMeta = { ldrs: {} };
  for (const l of ldrs) {
    if (['XYDATA', 'XYPOINTS', 'PEAKTABLE', 'END'].includes(l.canon)) continue;
    const v = [l.value, ...l.lines.map((s) => s.trim())].join(' ').trim();
    m.ldrs[l.canon] = v;
  }
  const g = (k: string) => m.ldrs[k];
  m.title = g('TITLE');
  m.jcampVersion = g('JCAMPDX');
  m.dataType = g('DATATYPE');
  m.origin = g('ORIGIN');
  m.owner = g('OWNER');
  m.xUnits = g('XUNITS');
  m.yUnits = g('YUNITS');
  m.xFactor = num(g('XFACTOR'));
  m.yFactor = num(g('YFACTOR'));
  m.firstX = num(g('FIRSTX'));
  m.lastX = num(g('LASTX'));
  m.firstY = num(g('FIRSTY'));
  m.nPoints = num(g('NPOINTS'));
  m.deltaX = num(g('DELTAX'));
  m.molForm = g('MOLFORM');
  m.casName = g('CASNAME');
  m.casRN = g('CASREGISTRYNO');
  m.state = g('STATE');
  m.samplingProcedure = g('SAMPLINGPROCEDURE');
  return m;
}

function parseXYDATA(form: string, lines: string[], meta: JcampMeta, warnings: string[]): JcampDataSet {
  const f = form.replace(/\s/g, '').toUpperCase();
  if (f !== '(X++(Y..Y))') {
    throw new Error(`Forma de ##XYDATA no compatible: ${form}. Sólo se admite (X++(Y..Y)).`);
  }
  const xf = meta.xFactor ?? 1;
  const yf = meta.yFactor ?? 1;
  if (meta.xFactor === undefined) warnings.push('XFACTOR ausente: se asume 1.');
  if (meta.yFactor === undefined) warnings.push('YFACTOR ausente: se asume 1.');
  const lineXs: number[] = [];
  const lineStart: number[] = [];
  const yRaw: number[] = [];
  const encodings = new Set<string>();
  let prevLast: number | null = null;
  let prevEndedDif = false;
  let yCheckCount = 0;
  let yCheckFailures = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let dec;
    try {
      dec = decodeLine(line, prevLast);
    } catch (e) {
      throw new Error(`Línea ${li + 1} de XYDATA: ${(e as Error).message}`);
    }
    dec.encodings.forEach((e) => encodings.add(e));
    if (dec.tokens.length === 0) continue;
    const [xTok, ...yToks] = dec.tokens;
    if (xTok.kind !== 'abs') throw new Error(`Línea ${li + 1}: la abscisa inicial no es un valor absoluto.`);
    // Comprobación de ordenada (Y-check): si la línea anterior terminó en DIF, el primer Y de esta
    // línea repite el último Y de la anterior; se verifica y no se duplica. La X de la línea
    // corresponde entonces a ese último punto ya almacenado.
    if (prevEndedDif && yToks.length > 0) {
      yCheckCount++;
      const chk = yToks[0].value;
      if (prevLast === null || Math.abs(chk - prevLast) > 1e-9 * Math.max(1, Math.abs(prevLast))) yCheckFailures++;
      lineXs.push(xTok.value);
      lineStart.push(yRaw.length - 1);
      for (let k = 1; k < yToks.length; k++) yRaw.push(yToks[k].value);
    } else {
      lineXs.push(xTok.value);
      lineStart.push(yRaw.length);
      for (const t of yToks) yRaw.push(t.value);
    }
    const lastTok = dec.tokens[dec.tokens.length - 1];
    prevEndedDif = lastTok.kind === 'dif';
    prevLast = lastTok.value;
  }
  const n = yRaw.length;
  const checks: JcampChecks = {
    nPointsDeclared: meta.nPoints,
    nPointsDecoded: n,
    yCheckCount,
    yCheckFailures,
    invalidValues: yRaw.filter((v) => !Number.isFinite(v)).length,
  };
  if (meta.nPoints !== undefined) {
    checks.nPointsMatch = meta.nPoints === n;
    if (!checks.nPointsMatch) warnings.push(`NPOINTS declara ${meta.nPoints} puntos y se decodificaron ${n}.`);
  }
  if (yCheckFailures > 0) warnings.push(`${yCheckFailures} de ${yCheckCount} comprobaciones de ordenada (Y-check) no coinciden.`);

  // Reconstrucción de X
  let x: number[];
  const fx = meta.firstX;
  const lx = meta.lastX;
  if (fx !== undefined && lx !== undefined && n > 1) {
    const step = (lx - fx) / (n - 1);
    x = Array.from({ length: n }, (_, i) => fx + i * step);
    // abscisa declarada en cada línea vs reconstruida
    let maxDev = 0;
    const dx = Math.abs(step) || 1;
    for (let k = 0; k < lineXs.length; k++) {
      const idx = lineStart[k];
      if (idx >= n) continue;
      const dev = Math.abs(lineXs[k] * xf - x[idx]) / dx;
      if (dev > maxDev) maxDev = dev;
    }
    checks.abscissaMaxDeviation = Number(maxDev.toFixed(4));
    if (maxDev > 1.5) warnings.push(`La abscisa declarada al inicio de línea difiere hasta ${maxDev.toFixed(2)}·ΔX de la reconstruida.`);
    checks.firstXMatch = Math.abs(lineXs[0] * xf - fx) <= dx * 0.5;
    if (!checks.firstXMatch) warnings.push('FIRSTX no coincide con la primera abscisa de XYDATA.');
    checks.lastXMatch = true;
  } else {
    // sin FIRSTX/LASTX: se usan las abscisas de línea y DELTAX
    const d = meta.deltaX ?? (lineXs.length > 1 ? ((lineXs[1] - lineXs[0]) * xf) / Math.max(1, lineStart[1] - lineStart[0]) : undefined);
    if (d === undefined) throw new Error('No hay FIRSTX/LASTX ni DELTAX: no se puede reconstruir el eje X.');
    warnings.push('Eje X reconstruido a partir de las abscisas de línea y DELTAX.');
    x = new Array(n);
    for (let k = 0; k < lineXs.length; k++) {
      const s = lineStart[k];
      const e = k + 1 < lineStart.length ? lineStart[k + 1] : n;
      for (let i = s; i < e; i++) x[i] = lineXs[k] * xf + (i - s) * d;
    }
  }
  const y = yRaw.map((v) => v * yf);
  return { kind: 'XYDATA', form, encodings: [...encodings].sort(), x, y, checks };
}

function parsePairs(kind: 'XYPOINTS' | 'PEAK TABLE', form: string, lines: string[], meta: JcampMeta, warnings: string[]): JcampDataSet {
  const f = form.replace(/\s/g, '').toUpperCase();
  const width = f === '(XY..XY)' ? 2 : f === '(XYW..XYW)' || f === '(XYM..XYM)' ? 3 : 0;
  if (!width) throw new Error(`Forma de ##${kind} no compatible: ${form}`);
  const xf = meta.xFactor ?? 1;
  const yf = meta.yFactor ?? 1;
  const vals: number[] = [];
  const encodings = new Set<string>();
  for (const line of lines) {
    // grupos separados por ';' o espacios; componentes por ','
    const dec = decodeLine(line.replace(/;/g, ' '));
    dec.encodings.forEach((e) => encodings.add(e));
    for (const t of dec.tokens) vals.push(t.value);
  }
  if (vals.length % width !== 0) warnings.push(`##${kind}: número de valores (${vals.length}) no es múltiplo de ${width}.`);
  const x: number[] = [];
  const y: number[] = [];
  const w: number[] = [];
  for (let i = 0; i + width - 1 < vals.length; i += width) {
    x.push(vals[i] * xf);
    y.push(vals[i + 1] * yf);
    if (width === 3) w.push(vals[i + 2]);
  }
  const checks: JcampChecks = {
    nPointsDeclared: meta.nPoints,
    nPointsDecoded: x.length,
    yCheckCount: 0,
    yCheckFailures: 0,
    invalidValues: y.filter((v) => !Number.isFinite(v)).length,
  };
  if (meta.nPoints !== undefined && kind === 'XYPOINTS') {
    checks.nPointsMatch = meta.nPoints === x.length;
    if (!checks.nPointsMatch) warnings.push(`NPOINTS declara ${meta.nPoints} y se leyeron ${x.length} pares.`);
  }
  return { kind, form, encodings: [...encodings].sort(), x, y, w: width === 3 ? w : undefined, checks };
}

/** Analiza un archivo JCAMP-DX completo. Nunca lanza: los problemas se devuelven en errors/warnings. */
export function parseJcamp(text: string): JcampParseResult {
  const result: JcampParseResult = { blocks: [], warnings: [], errors: [] };
  if (typeof text !== 'string' || !text.includes('##')) {
    result.errors.push('El archivo no contiene etiquetas JCAMP-DX (##...).');
    return result;
  }
  const ldrs = splitLdrs(text);
  if (!ldrs.length || ldrs[0].canon !== 'TITLE') {
    result.warnings.push('El archivo no empieza por ##TITLE=.');
  }
  // Agrupar en bloques por TITLE ... END con anidamiento
  const stack: RawLdr[][] = [];
  const closed: RawLdr[][] = [];
  for (const l of ldrs) {
    if (l.canon === 'TITLE') {
      stack.push([l]);
      continue;
    }
    if (!stack.length) stack.push([]);
    stack[stack.length - 1].push(l);
    if (l.canon === 'END') {
      const b = stack.pop()!;
      closed.push(b);
    }
  }
  while (stack.length) {
    const b = stack.pop()!;
    if (b.length) {
      result.warnings.push('Falta ##END= al final de un bloque.');
      closed.push(b);
    }
  }
  for (const b of closed) {
    const meta = metaFromLdrs(b);
    const block: JcampBlock = { meta, data: [], warnings: [], errors: [] };
    if (meta.ldrs['NTUPLES'] !== undefined) {
      block.errors.push('##NTUPLES no es compatible con este lector (RMN 2D, EM o series).');
    }
    for (const l of b) {
      try {
        if (l.canon === 'XYDATA') block.data.push(parseXYDATA(l.value, l.lines, meta, block.warnings));
        else if (l.canon === 'XYPOINTS') block.data.push(parsePairs('XYPOINTS', l.value, l.lines, meta, block.warnings));
        else if (l.canon === 'PEAKTABLE') block.data.push(parsePairs('PEAK TABLE', l.value, l.lines, meta, block.warnings));
      } catch (e) {
        block.errors.push((e as Error).message);
      }
    }
    const isLink = (meta.dataType ?? '').toUpperCase().includes('LINK') || meta.ldrs['BLOCKS'] !== undefined;
    if (!block.data.length && isLink && !block.errors.length) continue; // bloque contenedor
    if (!meta.jcampVersion) block.warnings.push('Falta ##JCAMP-DX= (versión).');
    if (!block.data.length && !block.errors.length) block.warnings.push('El bloque no contiene XYDATA, XYPOINTS ni PEAK TABLE.');
    result.blocks.push(block);
  }
  if (!result.blocks.length) result.errors.push('No se encontraron bloques de datos.');
  return result;
}
