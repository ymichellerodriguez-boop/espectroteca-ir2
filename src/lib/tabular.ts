/** Lectura de espectros en CSV / TXT / JSON con detección de separador, decimal y encabezado. */

export interface TableParse {
  columns: string[];
  rows: number[][];
  delimiter: string;
  decimalComma: boolean;
  headerDetected: boolean;
  skippedLines: number;
}

const CANDIDATES = ['\t', ';', ',', ' '];

function splitLine(line: string, d: string): string[] {
  return d === ' ' ? line.trim().split(/\s+/) : line.split(d).map((s) => s.trim());
}

function toNum(s: string, decimalComma: boolean): number {
  const t = decimalComma ? s.replace(/\./g, '').replace(',', '.') : s;
  if (t === '') return NaN;
  return Number(t);
}

export function parseDelimited(text: string): TableParse {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter((l) => l !== '' && !l.startsWith('#'));
  const sample = lines.slice(0, 50);
  let best = { d: ',', score: -1, cols: 0 };
  for (const d of CANDIDATES) {
    const counts = sample.map((l) => splitLine(l, d).length);
    const mode = counts.sort((a, b) => counts.filter((c) => c === b).length - counts.filter((c) => c === a).length)[0];
    const consistent = sample.filter((l) => splitLine(l, d).length === mode).length;
    const score = mode >= 2 ? consistent * mode : -1;
    if (score > best.score) best = { d, score, cols: mode };
  }
  const d = best.d;
  // coma decimal: separador ';' o tabulador y valores con coma
  const decimalComma = (d === ';' || d === '\t' || d === ' ') && sample.some((l) => /\d,\d/.test(l));
  const rows: number[][] = [];
  let header: string[] | null = null;
  let skipped = 0;
  for (const l of lines) {
    const parts = splitLine(l, d);
    const nums = parts.map((p) => toNum(p, decimalComma));
    const numeric = nums.filter(Number.isFinite).length;
    if (numeric >= 2 && numeric >= parts.length - 1) rows.push(nums);
    else if (!rows.length && !header) header = parts;
    else skipped++;
  }
  const ncol = rows.length ? Math.max(...rows.map((r) => r.length)) : header?.length ?? 0;
  const columns = Array.from({ length: ncol }, (_, i) => header?.[i] || `Columna ${i + 1}`);
  return { columns, rows, delimiter: d, decimalComma, headerDetected: !!header, skippedLines: skipped };
}

/** Acepta {x:[],y:[]}, {data:{x,y}}, [[x,y],...] o [{x,y},...]. */
export function parseSpectrumJson(text: string): { x: number[]; y: number[]; meta: Record<string, unknown> } {
  const j = JSON.parse(text);
  const pick = (o: Record<string, unknown>) => ({ x: (o.x as number[]) ?? [], y: (o.y as number[]) ?? [] });
  let x: number[] = [];
  let y: number[] = [];
  let meta: Record<string, unknown> = {};
  if (Array.isArray(j)) {
    if (j.length && Array.isArray(j[0])) {
      x = j.map((r: number[]) => Number(r[0]));
      y = j.map((r: number[]) => Number(r[1]));
    } else {
      x = j.map((r: { x: number }) => Number(r.x));
      y = j.map((r: { y: number }) => Number(r.y));
    }
  } else if (j && typeof j === 'object') {
    if (j.data && typeof j.data === 'object') ({ x, y } = pick(j.data));
    else if (j.spectrum && typeof j.spectrum === 'object') ({ x, y } = pick(j.spectrum));
    else ({ x, y } = pick(j));
    meta = { name: j.name ?? j.title, xUnits: j.xUnits, yUnits: j.yUnits };
  }
  if (!x.length || x.length !== y.length) throw new Error('El JSON no contiene pares X/Y reconocibles (se esperan arrays x e y de igual longitud).');
  return { x: x.map(Number), y: y.map((v) => (v === null ? NaN : Number(v))), meta };
}
