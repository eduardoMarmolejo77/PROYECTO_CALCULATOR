import { httpApi } from '../../http/clienteHttp';
import { llamarApi } from '../../http/clienteApi';
import {
  mapearClienteInterfuerza,
  mapearCotizacionInterfuerza,
  mapearProductoInterfuerza,
  mapearProveedorInterfuerza,
} from '../../mapeadores';
import { construirPayloadCotizacionInterfuerza } from './payloads';

export const interfuerzaAdapter = {
  async obtenerProductos({ pagina = 1 } = {}) {
    const respuesta = await httpApi.get('products', { page: String(pagina) });
    const products = Array.isArray(respuesta.products) ? respuesta.products : [];

    return {
      datos: products.map(mapearProductoInterfuerza),
      total: Number.parseInt(respuesta.count, 10) || products.length,
      pagina,
      raw: respuesta,
    };
  },

  async obtenerCategorias() {
    const respuesta = await httpApi.get('categories');
    const categories = Array.isArray(respuesta.categories) ? respuesta.categories : [];

    return {
      datos: categories.map((categoria) => ({
        categoriaL1: String(categoria.Category_L1 || '').trim(),
        categoriaL2: String(categoria.Category_L2 || '').trim(),
        categoriaL3: String(categoria.Category_L3 || '').trim(),
        raw: categoria,
      })),
      raw: respuesta,
    };
  },

  async obtenerClientes({ pagina = 1 } = {}) {
    const respuesta = await httpApi.get('customers', { page: String(pagina) });
    const customers = Array.isArray(respuesta.customers) ? respuesta.customers : [];

    return {
      datos: customers.map(mapearClienteInterfuerza),
      total: Number.parseInt(respuesta.count, 10) || customers.length,
      pagina,
      raw: respuesta,
    };
  },

  async obtenerProveedores({ pagina = 1 } = {}) {
    const respuesta = await httpApi.get('providers', { page: String(pagina) });
    const providers = [
      respuesta.providers,
      respuesta.provider,
      respuesta.proveedores,
      respuesta.suppliers,
      respuesta.supplier,
      respuesta.vendors,
    ].find(Array.isArray) || [];

    return {
      datos: providers.map(mapearProveedorInterfuerza),
      total: Number.parseInt(respuesta.count, 10) || providers.length,
      pagina,
      raw: respuesta,
    };
  },

  async obtenerProveedor({ id }) {
    const respuesta = await httpApi.get('provider', { id });
    const provider = respuesta.provider || respuesta.proveedor || respuesta;

    return {
      datos: mapearProveedorInterfuerza(provider),
      raw: respuesta,
    };
  },

  async obtenerCotizacion({ id }) {
    const respuesta = await httpApi.get('quote', { id });
    return {
      datos: mapearCotizacionInterfuerza(respuesta),
      raw: respuesta,
    };
  },

  async crearProducto(data) {
    const respuesta = await httpApi.put('product', data);
    return {
      id: respuesta?.response?.id || respuesta?.id || data?.Item_Number || '',
      raw: respuesta,
    };
  },

  async crearCotizacion(data) {
    const payload = construirPayloadCotizacionInterfuerza(data);
    const respuesta = await llamarApi({ payload, timeoutMs: 30000 });

    return {
      id: (
        respuesta?.response?.id ||
        respuesta?.Quote?.id ||
        respuesta?.quote?.id ||
        respuesta?.id ||
        respuesta?.ID ||
        respuesta?.QuoteID ||
        ''
      ),
      raw: respuesta,
    };
  },
};
