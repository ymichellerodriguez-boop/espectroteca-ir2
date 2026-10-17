import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import { Loading } from './components/ui';
import './styles/global.css';
import './styles/pages.css';

// HashRouter: GitHub Pages no reescribe rutas, así que /#/biblioteca funciona al recargar.
const Library = lazy(() => import('./pages/Library'));
const SpectrumDetail = lazy(() => import('./pages/SpectrumDetail'));
const Analyze = lazy(() => import('./pages/Analyze'));
const Compare = lazy(() => import('./pages/Compare'));
const Learn = lazy(() => import('./pages/Learn'));
const Activities = lazy(() => import('./pages/Activities'));
const Inventory = lazy(() => import('./pages/Inventory'));
const NotFound = lazy(() => import('./pages/NotFound'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Suspense fallback={<Loading what="la sección" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="biblioteca" element={<Library />} />
            <Route path="espectro/:id" element={<SpectrumDetail />} />
            <Route path="analizar" element={<Analyze />} />
            <Route path="comparar" element={<Compare />} />
            <Route path="aprender" element={<Learn />} />
            <Route path="aprender/:lesson" element={<Learn />} />
            <Route path="actividades" element={<Activities />} />
            <Route path="inventario" element={<Inventory />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  </StrictMode>,
);
