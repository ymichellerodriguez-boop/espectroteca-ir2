/** Reconocimiento del formato y lectura de los archivos que sube el usuario. */

export type FileKind = 'jcamp' | 'csv' | 'txt' | 'json' | 'image' | 'pdf' | 'docx' | 'desconocido';

export const ACCEPT = '.jdx,.dx,.jcamp,.jcm,.csv,.txt,.tsv,.json,.png,.jpg,.jpeg,.gif,.webp,.pdf,.docx';
export const MAX_BYTES = 25 * 1024 * 1024;

export async function detectKind(file: File): Promise<FileKind> {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const txt = new TextDecoder('latin1').decode(head);
  if (head[0] === 0x25 && txt.startsWith('%PDF')) return 'pdf';
  if (head[0] === 0x50 && head[1] === 0x4b) return ext === 'docx' ? 'docx' : 'desconocido';
  if (head[0] === 0x89 && txt.slice(1, 4) === 'PNG') return 'image';
  if (head[0] === 0xff && head[1] === 0xd8) return 'image';
  if (txt.startsWith('GIF8')) return 'image';
  if (txt.startsWith('RIFF') && txt.slice(8, 12) === 'WEBP') return 'image';
  if (/^\s*##\s*TITLE\s*=/im.test(txt) || ['jdx', 'dx', 'jcamp', 'jcm'].includes(ext)) return 'jcamp';
  if (/^\s*[[{]/.test(txt) || ext === 'json') return 'json';
  if (ext === 'csv') return 'csv';
  if (ext === 'txt' || ext === 'tsv' || /^[\s\d.,;\-+eE\t]+$/m.test(txt)) return 'txt';
  return 'desconocido';
}

export async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const utf = new TextDecoder('utf-8').decode(buf);
  return utf.includes('�') ? new TextDecoder('latin1').decode(buf) : utf;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('No se pudo abrir la imagen.'));
    img.src = src;
  });
}

/** Renderiza una página de un PDF como imagen (pdf.js, sin servidor). */
export async function pdfPageImage(file: File, page = 1): Promise<{ url: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const p = await doc.getPage(Math.min(Math.max(1, page), doc.numPages));
  const vp = p.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = vp.width;
  canvas.height = vp.height;
  await p.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
  return { url: canvas.toDataURL('image/png'), pages: doc.numPages };
}

/** Lista las imágenes incrustadas en un DOCX (word/media) en el orden del documento. */
export async function docxImages(file: File): Promise<{ name: string; url: string; caption: string }[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const rels = await zip.file('word/_rels/document.xml.rels')?.async('string');
  const doc = await zip.file('word/document.xml')?.async('string');
  const rmap = new Map<string, string>();
  if (rels) for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rmap.set(m[1], m[2]);
  const out: { name: string; url: string; caption: string }[] = [];
  const seen = new Set<string>();
  if (doc) {
    // texto del párrafo previo a cada imagen como título orientativo
    const paras = doc.split('</w:p>');
    let lastText = '';
    for (const p of paras) {
      const text = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('').trim();
      const emb = [...p.matchAll(/r:embed="([^"]+)"/g)].map((m) => m[1]);
      for (const e of emb) {
        const target = rmap.get(e);
        if (!target) continue;
        const path = `word/${target.replace(/^\//, '')}`;
        const f = zip.file(path);
        if (!f || seen.has(path)) continue;
        seen.add(path);
        const blob = await f.async('blob');
        const ext = path.split('.').pop()!.toLowerCase();
        const mime = ext === 'gif' ? 'image/gif' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
        if (!mime.startsWith('image/')) continue;
        out.push({ name: path.split('/').pop()!, url: URL.createObjectURL(new Blob([blob], { type: mime })), caption: text || lastText });
      }
      if (text) lastText = text;
    }
  }
  return out;
}
