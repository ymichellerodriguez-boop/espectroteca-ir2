import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/biblioteca', label: 'Biblioteca', icon: 'lib' },
  { to: '/analizar', label: 'Analizar', icon: 'up' },
  { to: '/comparar', label: 'Comparar', icon: 'cmp' },
  { to: '/aprender', label: 'Aprender', icon: 'learn' },
  { to: '/actividades', label: 'Actividades', icon: 'play' },
  { to: '/inventario', label: 'Inventario', icon: 'inv' },
];

function Icon({ name }: { name: string }) {
  const p: Record<string, string> = {
    home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    lib: 'M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 3 15-3.5 1z',
    up: 'M12 16V4m0 0l-5 5m5-5l5 5M4 20h16',
    cmp: 'M3 17c3 0 4-10 6-10s3 7 5 7 3-9 7-9M3 21h18',
    learn: 'M2 8l10-5 10 5-10 5zM6 10v5c3 3 9 3 12 0v-5',
    play: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z',
    inv: 'M4 6h16M4 12h16M4 18h10',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={p[name]} />
    </svg>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#fff" />
      <path d="M6 18 C14 18 16 20 19 30 C21 38 23 46 25 30 C27 18 30 18 34 18 C38 18 39 22 41 40 C42 50 43 50 45 26 C47 18 52 18 58 18" fill="none" stroke="#B8336A" strokeWidth="4" strokeLinecap="round" />
      <rect x="38" y="30" width="10" height="26" rx="3" fill="#F2C94C" opacity=".55" />
    </svg>
  );
}

export default function Layout() {
  const [more, setMore] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setMore(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  return (
    <>
      <a href="#contenido" className="visually-hidden">
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="wrap">
          <Link to="/" className="brand" aria-label="Espectroteca IR, inicio">
            <Logo />
            Espectroteca IR
          </Link>
          <nav aria-label="Principal" style={{ marginLeft: 'auto' }}>
            <ul className="nav-links">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.end}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="contenido">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap">
          <p>
            Espectroteca IR es un proyecto educativo sin fines comerciales. Los espectros de la biblioteca inicial proceden de impresiones de{' '}
            <a href="https://sdbs.db.aist.go.jp/" target="_blank" rel="noreferrer">
              SDBS
            </a>{' '}
            (National Institute of Advanced Industrial Science and Technology, AIST, Japón) incluidas en el documento ESPECTROS.docx. Cite «SDBS, AIST, fecha de acceso» si utiliza estos datos.
          </p>
          <p>Las asignaciones son propuestas didácticas basadas en intervalos orientativos; no sustituyen la interpretación de un especialista.</p>
        </div>
      </footer>
      <nav className="mobile-nav" aria-label="Principal (móvil)">
        {LINKS.slice(0, 4).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <Icon name={l.icon} />
            {l.label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}>
          <Icon name="more" />
          Más
        </button>
      </nav>
      {more && (
        <>
          <div className="scrim" onClick={() => setMore(false)} />
          <div className="more-sheet" role="dialog" aria-label="Más secciones">
            {LINKS.slice(4).map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
