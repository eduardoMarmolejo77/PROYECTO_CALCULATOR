import { obtenerAdapter } from '../../../integraciones/proveedores';

export function obtenerProductosCatalogo(filtros = {}) {
  return obtenerAdapter().obtenerProductos(filtros);
}

export function obtenerCategoriasCatalogo() {
  return obtenerAdapter().obtenerCategorias();
}
