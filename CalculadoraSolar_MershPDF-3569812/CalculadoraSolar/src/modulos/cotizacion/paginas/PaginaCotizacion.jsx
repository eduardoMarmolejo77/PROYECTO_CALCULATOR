import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CATEGORIAS, obtenerCatalogo, obtenerCatalogoEnCache } from '../configuracion/catalogoProductos';
import FlujoPropuesta from '../componentes/FlujoPropuesta';

/**
 * Página principal del módulo de propuestas.
 * Carga el catálogo y orquesta el flujo de menús.
 */
export default function PaginaPropuesta() {
  const location = useLocation();
  const iniciarSinCalculadora = location.pathname === '/cotizar-sin-calculadora';
  const catalogoEnCache = obtenerCatalogoEnCache();
  const [productos, setProductos] = useState(() => catalogoEnCache?.products || []);
  const [categorias, setCategorias] = useState(() => catalogoEnCache?.categories || CATEGORIAS);
  const [clientes, setClientes] = useState(() => catalogoEnCache?.customers || []);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(() => !catalogoEnCache);
  const [errorCatalogo, setErrorCatalogo] = useState('');

  useEffect(() => {
    let componenteMontado = true;

    async function cargarCatalogo() {
      const catalogoActual = obtenerCatalogoEnCache();
      if (catalogoActual) {
        setProductos(catalogoActual.products);
        setCategorias(catalogoActual.categories);
        setClientes(catalogoActual.customers || []);
        setCargandoCatalogo(false);
        return;
      }

      setCargandoCatalogo(true);
      setErrorCatalogo('');

      try {
        const catalogo = await obtenerCatalogo();
        if (!componenteMontado) return;
        setProductos(catalogo.products);
        setCategorias(catalogo.categories);
        setClientes(catalogo.customers || []);
      } catch (error) {
        if (!componenteMontado) return;
        setErrorCatalogo(error.message || 'No se pudo cargar el catálogo desde InterFuerza.');
        setProductos([]);
        setCategorias(CATEGORIAS);
        setClientes([]);
      } finally {
        if (componenteMontado) setCargandoCatalogo(false);
      }
    }

    cargarCatalogo();

    return () => {
      componenteMontado = false;
    };
  }, []);

  return (
    <FlujoPropuesta
      productos={productos}
      categorias={categorias}
      clientes={clientes}
      cargandoCatalogo={cargandoCatalogo}
      errorCatalogo={errorCatalogo}
      iniciarSinCalculadora={iniciarSinCalculadora}
    />
  );
}
