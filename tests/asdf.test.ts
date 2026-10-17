import { describe, expect, it } from 'vitest';
import { decodeLine, tokenizeLine } from '../src/lib/jcamp/asdf';

const vals = (line: string, prev: number | null = null) => decodeLine(line, prev).tokens.map((t) => t.value);

describe('decodificación AFFN / PAC', () => {
  it('lee números separados por espacios y comas', () => {
    expect(vals('1000 0.95 0.94, 0.90')).toEqual([1000, 0.95, 0.94, 0.9]);
  });
  it('PAC: el signo separa valores', () => {
    const r = decodeLine('574.93-494082 275980-462136');
    expect(r.tokens.map((t) => t.value)).toEqual([574.93, -494082, 275980, -462136]);
    expect(r.encodings.has('PAC')).toBe(true);
  });
  it('acepta exponentes con signo y con punto decimal', () => {
    expect(vals('1.5E-3 2.0e+2 3.E2')).toEqual([0.0015, 200, 300]);
  });
  it('no confunde un SQZ «E» tras la abscisa con un exponente', () => {
    // 630.7 seguido del valor SQZ E22708282 (= +522708282)
    expect(vals('630.7E22708282')).toEqual([630.7, 522708282]);
  });
  it('marca valores ausentes con ?', () => {
    const v = vals('100 1 ? 3');
    expect(v[0]).toBe(100);
    expect(Number.isNaN(v[2])).toBe(true);
  });
});

describe('decodificación ASDF', () => {
  it('SQZ: A-I positivos, a-i negativos, @ = 0', () => {
    expect(vals('A1B2@c3')).toEqual([11, 22, 0, -33]);
  });
  it('DIF acumula diferencias', () => {
    expect(vals('A00JKj')).toEqual([100, 101, 103, 102]);
  });
  it('DUP repite el último valor (abs) o la última diferencia (dif)', () => {
    expect(vals('A00T')).toEqual([100, 100]);
    expect(vals('A00KU')).toEqual([100, 102, 104, 106]);
  });
  it('ejemplo completo: 1000A00KT%Tj → 100 102 104 104 104 103', () => {
    expect(vals('1000A00KT%Tj')).toEqual([1000, 100, 102, 104, 104, 104, 103]);
    expect([...decodeLine('1000A00KT%Tj').encodings].sort()).toEqual(['AFFN', 'DIF', 'DUP', 'SQZ']);
  });
  it('rechaza caracteres no válidos y DIF sin valor previo', () => {
    expect(() => tokenizeLine('100 # 3')).toThrow(/no válido/);
    expect(() => decodeLine('J5', null)).toThrow(/DIF/);
  });
});
