/**
 * Decodificador de líneas de datos JCAMP-DX: formas AFFN, PAC y ASDF (SQZ, DIF, DUP).
 * Referencia: McDonald, R. S.; Wilks, P. A. "JCAMP-DX: A Standard Form for Exchange of
 * Infrared Spectra in Computer Readable Form". Appl. Spectrosc. 1988, 42, 151-162.
 *
 * Pseudo-dígitos:
 *   SQZ  @=0  A-I = +1..+9   a-i = -1..-9   inicio de un valor absoluto con signo
 *   DIF  %=0  J-R = +1..+9   j-r = -1..-9   diferencia respecto al valor anterior
 *   DUP  S-Z = 1..8, s = 9                   número TOTAL de apariciones del elemento anterior
 *   ?    valor ausente
 * Separadores AFFN: espacio, tabulador, coma, punto y coma; en PAC el signo +/- también separa.
 */

export type RawKind = 'affn' | 'sqz' | 'dif' | 'dup' | 'missing';
export interface RawToken {
  kind: RawKind;
  text: string;
}

export type TokenKind = 'abs' | 'dif' | 'missing';
export interface DecodedToken {
  kind: TokenKind;
  value: number;
}
export interface LineDecodeResult {
  tokens: DecodedToken[];
  encodings: Set<string>;
}

const SQZ_POS = '@ABCDEFGHI';
const SQZ_NEG = '@abcdefghi';
const DIF_POS = '%JKLMNOPQR';
const DIF_NEG = '%jklmnopqr';
const DUP = ' STUVWXYZs';

function pseudo(ch: string): { kind: 'sqz' | 'dif' | 'dup'; digit: number } | null {
  let i = SQZ_POS.indexOf(ch);
  if (i >= 0) return { kind: 'sqz', digit: i };
  i = SQZ_NEG.indexOf(ch);
  if (i > 0) return { kind: 'sqz', digit: -i };
  i = DIF_POS.indexOf(ch);
  if (i >= 0) return { kind: 'dif', digit: i };
  i = DIF_NEG.indexOf(ch);
  if (i > 0) return { kind: 'dif', digit: -i };
  i = DUP.indexOf(ch);
  if (i > 0) return { kind: 'dup', digit: i };
  return null;
}

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';
const isSep = (c: string) => c === ' ' || c === '\t' || c === ',' || c === ';';

/** Divide una línea en tokens crudos. Lanza un error si encuentra un carácter no permitido. */
export function tokenizeLine(line: string): RawToken[] {
  const out: RawToken[] = [];
  const n = line.length;
  let i = 0;
  while (i < n) {
    const ch = line[i];
    if (isSep(ch)) {
      i++;
      continue;
    }
    if (ch === '?') {
      out.push({ kind: 'missing', text: '?' });
      i++;
      continue;
    }
    const p = pseudo(ch);
    if (p) {
      let text = p.digit < 0 ? '-' + String(-p.digit) : String(p.digit);
      i++;
      while (isDigit(line[i])) text += line[i++];
      if (line[i] === '.') throw new Error(`Punto decimal dentro de un valor ASDF (posición ${i + 1})`);
      out.push({ kind: p.kind, text });
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '.' || isDigit(ch)) {
      let text = '';
      if (ch === '+' || ch === '-') {
        if (ch === '-') text = '-';
        i++;
      }
      while (i < n) {
        const c = line[i];
        if (isDigit(c) || c === '.') {
          text += c;
          i++;
        } else if ((c === 'E' || c === 'e') && /[0-9.]$/.test(text) && (isDigit(line[i + 1]) || line[i + 1] === '+' || line[i + 1] === '-')) {
          // exponente AFFN (p. ej. 18.189E-13). 'E' y 'e' son también pseudo-dígitos SQZ (+5/-5):
          // sólo se interpretan como exponente si el número tiene punto decimal o les sigue un signo.
          // Además, tras la E sólo puede haber 1-3 cifras seguidas de separador o fin de línea:
          // "630.7E22708282" es X=630.7 seguido del valor SQZ "E22708282", no un exponente.
          const signed = line[i + 1] === '+' || line[i + 1] === '-';
          const m = /^[+-]?(\d{1,3})(?=$|[\s,;+\-])/.exec(line.slice(i + 1));
          if (!m || (!signed && !text.includes('.'))) break;
          text += 'E';
          i++;
          if (line[i] === '+' || line[i] === '-') text += line[i++];
        } else break;
      }
      if (text === '' || text === '-' || text === '.') throw new Error(`Número AFFN incompleto (posición ${i})`);
      out.push({ kind: 'affn', text });
      continue;
    }
    throw new Error(`Carácter no válido en datos JCAMP-DX: "${ch}" (posición ${i + 1})`);
  }
  return out;
}

function toNumber(t: RawToken): number {
  const v = Number(t.text);
  if (!Number.isFinite(v)) throw new Error(`Valor numérico no válido: "${t.text}"`);
  return v;
}

/**
 * Decodifica una línea y resuelve DIF y DUP.
 * @param prevLast último valor de la línea anterior; permite una DIF al inicio (poco habitual).
 */
export function decodeLine(line: string, prevLast: number | null = null): LineDecodeResult {
  const raw = tokenizeLine(line);
  const encodings = new Set<string>();
  // PAC: un signo pegado a una cifra anterior separa valores sin espacio
  if (/[0-9.][+-][0-9.]/.test(line.replace(/[eE][+-]/g, 'e0'))) encodings.add('PAC');
  const tokens: DecodedToken[] = [];
  let last: { kind: 'abs' | 'dif'; value: number; diff: number } | null = null;
  let prev = prevLast;
  for (const t of raw) {
    switch (t.kind) {
      case 'missing':
        tokens.push({ kind: 'missing', value: NaN });
        last = null;
        break;
      case 'affn':
      case 'sqz': {
        encodings.add(t.kind === 'affn' ? 'AFFN' : 'SQZ');
        const v = toNumber(t);
        tokens.push({ kind: 'abs', value: v });
        last = { kind: 'abs', value: v, diff: 0 };
        prev = v;
        break;
      }
      case 'dif': {
        encodings.add('DIF');
        if (prev === null) throw new Error('Diferencia (DIF) sin valor previo');
        const d = toNumber(t);
        const v = prev + d;
        tokens.push({ kind: 'dif', value: v });
        last = { kind: 'dif', value: v, diff: d };
        prev = v;
        break;
      }
      case 'dup': {
        encodings.add('DUP');
        if (!last) throw new Error('Repetición (DUP) sin elemento previo');
        const count = toNumber(t);
        for (let k = 1; k < count; k++) {
          const v: number = last.kind === 'dif' ? (prev as number) + last.diff : last.value;
          tokens.push({ kind: last.kind, value: v });
          prev = v;
        }
        break;
      }
    }
  }
  return { tokens, encodings };
}
