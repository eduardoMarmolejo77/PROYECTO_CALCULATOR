import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { contenedor } from '../contenedor/contenedorModulos';
import { useAutenticacion } from '../auth/usarAutenticacion';
import '../../modulos/sistema/estilos/sistema.css';

export default function BarraNavegacion() {
  const { usuario, cerrarSesion } = useAutenticacion();
  const location = useLocation();
  const [rutaCargando, setRutaCargando] = useState('');
  const itemsNavegacion = contenedor.obtenerItemsNavegacion();

  useEffect(() => {
    if (!rutaCargando) return undefined;

    const temporizador = window.setTimeout(() => {
      setRutaCargando('');
    }, 650);

    return () => window.clearTimeout(temporizador);
  }, [location.pathname, rutaCargando]);

  return (
    <header className="navbar">
      <div className="navbar__left">
        <h2 className="navbar__greeting">
          Hola, <span className="navbar__username">{usuario?.nombreCompleto || 'Usuario'}</span>
        </h2>
      </div>

      {itemsNavegacion.length > 0 && (
        <nav className="navbar__nav" aria-label="Navegación principal">
          {itemsNavegacion.map((item) => {
            const estaCargando = rutaCargando === item.ruta;

            return (
              <NavLink
                key={item.ruta}
                aria-busy={estaCargando}
                className={({ isActive }) => [
                  'navbar__link',
                  isActive ? 'navbar__link--activo' : '',
                  estaCargando ? 'navbar__link--cargando' : '',
                ].filter(Boolean).join(' ')}
                to={item.ruta}
                onClick={() => {
                  if (item.ruta !== location.pathname) {
                    setRutaCargando(item.ruta);
                  }
                }}
              >
                {estaCargando && <span className="navbar__link-spinner" aria-hidden="true" />}
                <span className="navbar__link-texto">{item.etiqueta}</span>
              </NavLink>
            );
          })}
        </nav>
      )}

      <div className="navbar__right">
        <div className="navbar__user-badge">
          <span className="navbar__avatar">
            {usuario?.nombreCompleto?.charAt(0)?.toUpperCase() || 'U'}
          </span>
          <span className="navbar__user-name">{usuario?.nombreUsuario}</span>
        </div>
        <button className="navbar__logout" onClick={cerrarSesion} title="Cerrar sesión">
          🚪 Salir
        </button>
      </div>
    </header>
  );
}
