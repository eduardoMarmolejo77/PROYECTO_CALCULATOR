import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RutaProtegida from '../auth/RutaProtegida';

const componentesLazy = new WeakMap();

function obtenerComponenteRuta(ruta) {
  if (ruta.elemento) return ruta.elemento;
  if (ruta.Componente) return <ruta.Componente />;

  if (typeof ruta.componente !== 'function') {
    throw new Error(`La ruta "${ruta.path}" no define componente.`);
  }

  if (!componentesLazy.has(ruta.componente)) {
    componentesLazy.set(ruta.componente, lazy(ruta.componente));
  }

  const Componente = componentesLazy.get(ruta.componente);
  return <Componente />;
}

function envolverRuta(ruta) {
  if (ruta.redireccion) {
    return <Navigate to={ruta.redireccion} replace />;
  }

  const elemento = obtenerComponenteRuta(ruta);

  if (!ruta.requiereAuth) return elemento;

  return (
    <RutaProtegida>
      {elemento}
    </RutaProtegida>
  );
}

export default function EnrutadorModular({ rutas = [], componenteNoEncontrado: ComponenteNoEncontrado }) {
  return (
    <Routes>
      {rutas.map((ruta) => (
        <Route key={ruta.path} path={ruta.path} element={envolverRuta(ruta)} />
      ))}
      {ComponenteNoEncontrado && <Route path="*" element={<ComponenteNoEncontrado />} />}
    </Routes>
  );
}
