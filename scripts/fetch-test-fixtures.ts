/**
 * Descarga los archivos JCAMP-DX reales que se usan en las pruebas (tests/jcamp.real.test.ts).
 *
 *   npm run fixtures:real                # descarga desde PyPI
 *   npm run fixtures:real -- --from ruta/jcamp-1.3.2.tar.gz   # usa un paquete ya descargado
 *
 * Origen: paquete de Python «jcamp» 1.3.2 (código bajo licencia MIT), carpeta data/infrared_spectra.
 * Los espectros incluidos proceden de NIST, Coblentz Society y otros titulares (ver ##ORIGIN/##OWNER
 * de cada archivo). Por eso NO se versionan en este repositorio: se guardan en tests/fixtures/real/,
 * que está en .gitignore, y sólo se usan para comprobar el conversor.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { ROOT, arg, ensureDir } from './lib/util';

const OUT = join(ROOT, 'tests', 'fixtures', 'real');
const PKG = 'jcamp';
const VERSION = '1.3.2';

async function download(): Promise<Buffer> {
  const meta = await fetch(`https://pypi.org/pypi/${PKG}/${VERSION}/json`);
  if (!meta.ok) throw new Error(`PyPI respondió ${meta.status}`);
  const j = (await meta.json()) as { urls: { packagetype: string; url: string; digests: { sha256: string } }[] };
  const sdist = j.urls.find((u) => u.packagetype === 'sdist');
  if (!sdist) throw new Error('No se encontró la distribución de código fuente en PyPI');
  const res = await fetch(sdist.url);
  if (!res.ok) throw new Error(`Descarga fallida (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Extrae entradas de un tar (formato ustar) en memoria. */
function* untar(buf: Buffer): Generator<{ name: string; data: Buffer }> {
  let off = 0;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (a: number, b: number) => h.subarray(a, b).toString('utf8').replace(/\0.*$/s, '');
    const name = (str(345, 500) ? str(345, 500) + '/' : '') + str(0, 100);
    const size = parseInt(str(124, 136).trim() || '0', 8);
    const type = String.fromCharCode(h[156]);
    off += 512;
    if (type === '0' || type === '\0') yield { name, data: buf.subarray(off, off + size) };
    off += Math.ceil(size / 512) * 512;
  }
}

async function main() {
  const from = arg('from');
  const tgz = from ? readFileSync(from) : await download();
  const tar = gunzipSync(tgz);
  ensureDir(OUT);
  let n = 0;
  for (const e of untar(tar)) {
    const m = /data\/infrared_spectra\/([^/]+\.jdx)$/i.exec(e.name);
    if (!m) continue;
    writeFileSync(join(OUT, m[1]), e.data);
    n++;
  }
  writeFileSync(
    join(OUT, 'PROCEDENCIA.md'),
    `# Archivos JCAMP-DX reales para pruebas\n\nExtraídos de ${PKG}-${VERSION} (PyPI), carpeta data/infrared_spectra (${n} archivos), el ${new Date().toISOString()}.\nNo se redistribuyen: consulte ##ORIGIN y ##OWNER de cada archivo para conocer su titular.\n`,
  );
  console.log(`${n} archivos JCAMP-DX en ${OUT}`);
  if (!n) process.exitCode = 1;
}

if (!existsSync(OUT) || process.argv.includes('--refresh') || !existsSync(join(OUT, 'PROCEDENCIA.md'))) {
  main().catch((e) => {
    console.error(`No se pudieron obtener los archivos de prueba: ${(e as Error).message}`);
    console.error('Alternativa: descargue jcamp-1.3.2.tar.gz desde https://pypi.org/project/jcamp/1.3.2/#files y ejecute');
    console.error('  npm run fixtures:real -- --from ruta/jcamp-1.3.2.tar.gz');
    process.exitCode = 1;
  });
} else {
  console.log(`Ya existen archivos en ${OUT} (use --refresh para volver a descargarlos).`);
}
