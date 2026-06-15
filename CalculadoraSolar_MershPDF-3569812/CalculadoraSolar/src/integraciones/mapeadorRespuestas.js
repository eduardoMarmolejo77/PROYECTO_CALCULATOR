import { obtenerConfiguracionApi } from './http/configuracionApi';

const MAPEOS = {
  interfuerza: {
    producto: {
      id: ['id', 'Item_Number', 'UPC_Code'],
      name: ['Nombre', 'Item_Number'],
      price: ['Precio_Venta_Real', 'Precio_Venta'],
      stock: ['InStock', 'Stock'],
      category: ['Category_L1', 'Category_L2'],
    },
    cotizacionLinea: {
      codigo: [
        'Codigo',
        'Código',
        'codigo',
        'code',
        'Code',
        'Item_Number',
        'item_number',
        'ItemNumber',
        'Item',
        'SKU',
        'Sku',
        'ProductCode',
        'Product_Code',
        'Modelo',
        'Model',
        'Referencia',
        'Reference',
        'UPC_Code',
        'UPC',
      ],
      nombre: [
        'Nombre',
        'Name',
        'Producto',
        'Product',
        'Descripcion',
        'Descripción',
        'Description',
        'Item_Description',
        'ItemDescription',
      ],
      cantidad: ['Cantidad', 'Quantity', 'Qty', 'Unidades'],
      precio: ['Precio', 'Price', 'Precio_Unitario'],
    },
  },
};

function extraerValor(objeto, campos = []) {
  for (const campo of campos) {
    const valor = objeto?.[campo];
    if (valor !== undefined && valor !== null && valor !== '') {
      return valor;
    }
  }

  return undefined;
}

function proveedorActivo() {
  return obtenerConfiguracionApi().provider;
}

export function mapearProducto(productoCrudo) {
  const mapeo = MAPEOS[proveedorActivo()]?.producto;
  if (!mapeo || !productoCrudo || typeof productoCrudo !== 'object') {
    return productoCrudo;
  }

  return {
    id: extraerValor(productoCrudo, mapeo.id),
    name: extraerValor(productoCrudo, mapeo.name),
    price: Number.parseFloat(extraerValor(productoCrudo, mapeo.price)) || 0,
    stock: extraerValor(productoCrudo, mapeo.stock),
    category: extraerValor(productoCrudo, mapeo.category),
    raw: productoCrudo,
  };
}

export function mapearLineaCotizacion(lineaCruda) {
  const mapeo = MAPEOS[proveedorActivo()]?.cotizacionLinea;
  if (!mapeo || !lineaCruda || typeof lineaCruda !== 'object') {
    return {
      codigo: '',
      nombre: '',
      cantidad: 0,
      precio: 0,
      raw: lineaCruda,
    };
  }

  return {
    codigo: String(extraerValor(lineaCruda, mapeo.codigo) || '').trim(),
    nombre: String(extraerValor(lineaCruda, mapeo.nombre) || '').trim(),
    cantidad: Number.parseFloat(extraerValor(lineaCruda, mapeo.cantidad)) || 0,
    precio: Number.parseFloat(extraerValor(lineaCruda, mapeo.precio)) || 0,
    raw: lineaCruda,
  };
}
