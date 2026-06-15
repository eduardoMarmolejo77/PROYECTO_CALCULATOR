import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { contenedor } from '../core/contenedor/contenedorModulos';
import { ProveedorAutenticacion } from '../core/auth/ProveedorAutenticacion';
import EnrutadorModular from '../core/router/EnrutadorModular';
import PaginaNoEncontrada from '../modulos/sistema/paginas/PaginaNoEncontrada';

/**
 * Aplicación principal con enrutador y proveedor de autenticación.
 */
function Aplicacion() {
  const rutas = contenedor.obtenerRutas();

  return (
    <BrowserRouter>
      <ProveedorAutenticacion>
        <Suspense
          fallback={
            <div className="loading-screen">
              <div className="loading-spinner" />
              <p>Cargando módulo...</p>
            </div>
          }
        >
          <EnrutadorModular rutas={rutas} componenteNoEncontrado={PaginaNoEncontrada} />
        </Suspense>
      </ProveedorAutenticacion>
    </BrowserRouter>
  );
}

export default Aplicacion;
