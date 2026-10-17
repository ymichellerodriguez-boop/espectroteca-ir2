/**
 * Busca claves privadas o tokens en los archivos del repositorio antes de publicar.
 *   npm run check:secrets
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { ROOT } from './lib/util';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'fixtures', 'spectra']);
const EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.md', '.html', '.env', '.py', '.css', '']);
const PATTERNS: [string, RegExp][] = [
  ['clave de Anthropic', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['clave de OpenAI', /sk-[A-Za-z0-9]{32,}/],
  ['token de GitHub', /gh[pousr]_[A-Za-z0-9]{30,}/],
  ['clave de Google', /AIza[0-9A-Za-z_-]{35}/],
  ['clave de AWS', /AKIA[0-9A-Z]{16}/],
  ['clave privada PEM', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['asignación de secreto', /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"\s]{16,}['"]/i],
];
const hits: string[] = [];
function walk(dir: string) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(f) && !f.startsWith('.import')) walk(p); continue; }
    if (!EXT.has(extname(f)) || st.size > 2_000_000) continue;
    const txt = readFileSync(p, 'utf8');
    for (const [name, re] of PATTERNS) if (re.test(txt)) hits.push(`${relative(ROOT, p)}: posible ${name}`);
  }
}
walk(ROOT);
if (hits.length) { hits.forEach((h) => console.log('ALERTA', h)); process.exitCode = 1; }
else console.log('No se encontraron claves privadas ni tokens.');
