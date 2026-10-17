import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeroSpectrum from '../components/HeroSpectrum';
import { Loading } from '../components/ui';
import { loadCategories, loadLibrary, loadSpectrum } from '../services/data';
import { useAsync } from '../services/useAsync';

export default function Home() {
  const hero = useAsync(() => loadSpectrum('ethyl-acetate'), []);
  const cats = useAsync(loadCategories, []);
  const lib = useAsync(loadLibrary, []);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const withData = cats.data?.categories.filter((c) => c.count > 0) ?? [];
  const pending = cats.data?.categories.filter((c) => c.count === 0) ?? [];
  return (
    <>
      <section className="hero" id="inicio">
        <div className="wrap">
          <div className="hero-text">
            <h1>Cada banda cuenta qué enlaces hay en la molécula</h1>
            <p className="lead">
              Consulte {lib.data ? lib.data.count : '…'} espectros infrarrojos reales, vea qué vibración produce cada banda y analice sus propios archivos JCAMP-DX, CSV o imágenes.
            </p>
            <form
              className="hero-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                nav(`/biblioteca?q=${encodeURIComponent(q)}`);
              }}
            >
              <label htmlFor="hq" className="visually-hidden">
                Buscar compuesto, grupo funcional o número de onda
              </label>
              <input id="hq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque «acetona», «C=O» o «1715»" />
              <button className="btn" type="submit">
                Buscar
              </button>
            </form>
          </div>
          {hero.data ? <HeroSpectrum rec={hero.data} /> : <div className="hero-spectrum placeholder" />}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>Biblioteca por grupo funcional</h2>
          <p className="muted">Una molécula puede aparecer en varios grupos: el guayacol, por ejemplo, es a la vez fenol, éter y compuesto aromático.</p>
          {cats.loading && <Loading what="las categorías" />}
          <ul className="cat-list">
            {withData.map((c) => (
              <li key={c.id}>
                <Link to={`/biblioteca?categoria=${c.id}`}>
                  <span className="cat-name">{c.name}</span>
                  <span className="cat-count">
                    {c.count}
                    <span className="muted"> / {c.target}</span>
                  </span>
                  <span className="cat-meter" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, (c.count / c.target) * 100)}%` }} />
                  </span>
                  <span className="cat-bands small">{c.keyBands}</span>
                </Link>
              </li>
            ))}
          </ul>
          {pending.length > 0 && (
            <p className="small muted">
              Aún sin espectros: {pending.map((c) => c.name).join(', ')}. El documento de origen sólo incluía sus nombres;{' '}
              <Link to="/inventario">consulte el inventario</Link> para ver qué falta y cómo incorporarlos.
            </p>
          )}
        </div>
      </section>

      <section className="section band-cream">
        <div className="wrap entry-grid">
          <div>
            <h2>¿Por dónde empezar?</h2>
            <p>Si es la primera vez que interpreta un espectro IR, siga las lecciones breves y luego pruebe con un compuesto conocido.</p>
          </div>
          <Link className="entry" to="/aprender">
            <h3>Aprender a leer un espectro</h3>
            <p>Número de onda, transmitancia, regiones y cómo combinar señales.</p>
          </Link>
          <Link className="entry" to="/analizar">
            <h3>Analizar mi espectro</h3>
            <p>Suba un JCAMP-DX, CSV, TXT, JSON, una imagen, un PDF o un DOCX.</p>
          </Link>
          <Link className="entry" to="/actividades">
            <h3>Ponerse a prueba</h3>
            <p>Encuentre la banda, identifique el grupo funcional o resuelva un caso de detective.</p>
          </Link>
        </div>
      </section>
    </>
  );
}
