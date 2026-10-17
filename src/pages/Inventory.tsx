import { Link } from 'react-router-dom';
import { ErrorBox, Loading } from '../components/ui';
import { loadInventory } from '../services/data';
import { useAsync } from '../services/useAsync';

const CHECK_LABEL: Record<string, string> = {
  'discrepancia-nombre': 'Nombre del Word distinto del impreso en la imagen',
  'imagen-duplicada': 'Imagen repetida de otra entrada',
  'no-verificable': 'Imagen sin nombre impreso (no verificable)',
};

export default function Inventory() {
  const inv = useAsync(loadInventory, []);
  if (inv.loading) return <Loading what="el inventario" />;
  if (inv.error || !inv.data) return <div className="wrap section"><ErrorBox msg={inv.error ?? 'Sin datos'} /></div>;
  const d = inv.data;
  const t = d.totals;
  const pt = d.peakTable;
  const totalPeaks = Object.values(pt).reduce((a, b) => a + b, 0);
  return (
    <div className="wrap inventory">
      <div className="page-head">
        <h1>Inventario de la biblioteca</h1>
        <p>Qué hay realmente, de dónde procede y qué falta para llegar al objetivo de 20–25 espectros por grupo funcional.</p>
      </div>

      <section className="inv-totals">
        <div>
          <span className="inv-num">{t.spectraInLibrary}</span>
          <span>espectros en la biblioteca</span>
        </div>
        <div>
          <span className="inv-num">{t.categoryAssociations}</span>
          <span>asociaciones espectro–categoría</span>
        </div>
        <div>
          <span className="inv-num">{t.verified}</span>
          <span>con nombre e imagen verificados</span>
        </div>
        <div>
          <span className="inv-num">{t.fromJcamp}</span>
          <span>importados de archivos JCAMP-DX</span>
        </div>
      </section>

      <section className="section">
        <h2>Por categoría</h2>
        <div className="table-wrap">
          <table className="data cards">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Espectros</th>
                <th>Progreso hacia {d.categories[0]?.target ?? 20}</th>
                <th>Pendientes (nombres del documento)</th>
              </tr>
            </thead>
            <tbody>
              {d.categories.map((c) => (
                <tr key={c.id} className={c.required && c.count === 0 ? 'hl' : ''}>
                  <td data-label="Categoría">
                    <Link to={`/biblioteca?categoria=${c.id}`}>{c.name}</Link>
                    {!c.required && <span className="small muted"> (adicional)</span>}
                  </td>
                  <td data-label="Espectros">{c.count}</td>
                  <td data-label="Progreso">
                    <span className="meter" aria-label={`${c.count} de ${c.target}`}>
                      <span style={{ width: `${Math.min(100, (c.count / c.target) * 100)}%` }} />
                    </span>
                    <span className="small">{c.missing ? `faltan ${c.missing}` : 'objetivo mínimo alcanzado'}</span>
                  </td>
                  <td data-label="Pendientes" className="small">
                    {c.pendingNames.length ? (
                      <details>
                        <summary>{c.pendingNames.length} nombres sin espectro</summary>
                        {c.pendingNames.join(', ')}
                      </details>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          «Compuestos aromáticos» suma todas las moléculas con anillo aromático (fenoles, ácidos aromáticos, etc.); una molécula cuenta en todas sus categorías. Las categorías en amarillo son obligatorias y todavía no tienen espectros: el documento sólo incluye la lista de nombres.
        </p>
      </section>

      <section className="section">
        <h2>Incidencias detectadas en el documento</h2>
        <ul className="issue-list">
          {d.issues.map((i) => (
            <li key={i.docIndex} className="panel">
              <strong>«{i.docName}»</strong> ({i.section}) — {CHECK_LABEL[i.nameCheck] ?? i.nameCheck}
              <p className="small">{i.detail}</p>
              {i.includedAs ? (
                <Link className="small" to={`/espectro/${i.includedAs}`}>
                  Incluido como {i.includedAs}
                </Link>
              ) : (
                <span className="small muted">No incluido en la biblioteca.</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Calidad de los datos</h2>
        <p>
          De {totalPeaks} picos leídos en las tablas impresas por SDBS, {pt.verificado ?? 0} ({Math.round(((pt.verificado ?? 0) / totalPeaks) * 100)} %) coinciden con un mínimo de la curva digitalizada, {pt.coherente ?? 0} son coherentes con ella, {pt.dudoso ?? 0} quedan marcados como dudosos y {pt['sin-curva'] ?? 0} caen en huecos de la curva.
        </p>
        <p>
          Las curvas interactivas proceden de digitalizar las imágenes con calibración comprobada de los ejes; no son archivos numéricos originales. Ningún espectro de la biblioteca se ha completado con datos inventados.
        </p>
      </section>

      <section className="section">
        <h2>Fuentes y condiciones de uso</h2>
        <ul>
          <li>
            <strong>SDBS</strong> (Spectral Database for Organic Compounds, AIST, Japón): acceso gratuito; prohíbe la descarga masiva o automatizada y el uso comercial sin permiso; pide citar «SDBS, National Institute of Advanced Industrial Science and Technology, fecha de acceso». Las imágenes se reproducen con fines educativos no comerciales y con cita.
          </li>
          <li>Documento de origen: {d.document.file} (SHA-256 {d.document.sha256.slice(0, 12)}…).</li>
        </ul>
        <h3>Cómo completar las categorías pendientes</h3>
        <ol>
          <li>Descargue manualmente (sin robots ni descargas masivas) los archivos JCAMP-DX o las imágenes de fuentes que permitan su uso, respetando sus límites diarios.</li>
          <li>Describa cada archivo en un manifiesto (compuesto, fórmula, categorías, fuente, identificador y si puede redistribuirse).</li>
          <li>
            Ejecute <span className="kbd">npm run jcamp:import -- --input carpeta --manifest manifiesto.json</span> y después <span className="kbd">npm run library:build</span>.
          </li>
        </ol>
        <p className="small muted">Las instrucciones completas están en el README del repositorio.</p>
      </section>
    </div>
  );
}
