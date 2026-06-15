function toFixedNumber(valor, decimales, fallback = '0.00') {
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) return fallback;
  return numero.toFixed(decimales);
}

function toSafeText(valor) {
  return String(valor || '').trim();
}

export function construirPayloadCotizacionInterfuerza({
  lineasPrecotizacion = [],
  detalleSeleccionProductos = {},
  vendedor = '',
  comentariosCliente = '',
  impuestosPorLinea = {},
  descuentosPorLinea = {},
  subtotalPrecotizacion = 0,
  descuentoPorcentajeNormalizado = 0,
  totalPrecotizacion = 0,
  clienteId = 'CONSUMIDOR-FINAL',
  clienteNombre = 'Consumidor Final',
  pais = 'PANAMA',
  bodega = 'Bodega Principal',
  reservarProductos = 'NO',
}) {
  const hoy = new Date();
  const fecha = hoy.toISOString().slice(0, 10);
  const fechaExpira = new Date(hoy.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);

  return {
    class: 'PUT',
    action: 'quotes',
    data: {
      Cliente: clienteId,
      Nombre: clienteNombre,
      Pais: pais,
      Bodega: bodega,
      Status: 'ACTIVE',
      Date: fecha,
      Expira: fechaExpira,
      ExtraData: null,
      Vendedor: toSafeText(vendedor),
      Comentario: toSafeText(comentariosCliente),
      Taxes: '0.00',
      Discount: toFixedNumber(descuentoPorcentajeNormalizado, 2),
      SubTotal: toFixedNumber(subtotalPrecotizacion, 2),
      Total: toFixedNumber(totalPrecotizacion, 2),
      Currency: 'USD',
      Currency_Rate: '1.000000000',
      Type: 'SALES-TEAM',
      Reservar_Productos: reservarProductos,
      Lines: lineasPrecotizacion.map((linea) => {
        const detalle = detalleSeleccionProductos?.[linea.id] || {};
        const impuestoLinea = impuestosPorLinea?.[linea.id] || {};
        const descuentoLinea = Number.parseFloat(descuentosPorLinea?.[linea.id]) || 0;
        const codigo = toSafeText(linea.codigo || detalle.productId || linea.id);
        const itemNumber = toSafeText(linea.itemNumber || detalle.itemNumber || codigo);

        return {
          Codigo: codigo,
          Item_Number: itemNumber,
          Nombre: linea.nombre,
          Descripcion: linea.nombre,
          Marca: toSafeText(linea?.raw?.Producto?.Marca || detalle.marca),
          Category_L1: toSafeText(linea.categoria),
          Category_L2: '',
          Category_L3: '',
          Unidades: toFixedNumber(linea.cantidad, 2),
          Precio_Unitario: toFixedNumber(linea.precioUnitario, 4, '0.0000'),
          Discount: toFixedNumber(descuentoLinea, 2),
          DiscountFactor: '0.00',
          TaxID: toSafeText(impuestoLinea.TaxID || '2'),
          TaxName: toSafeText(impuestoLinea.TaxName || 'EXENTO'),
          TaxFactor: toFixedNumber(impuestoLinea.TaxFactor ?? 0, 2),
          TaxValue: toFixedNumber(impuestoLinea.TaxValue ?? 0, 4, '0.0000'),
          Total: toFixedNumber(linea.total, 2),
        };
      }),
    },
  };
}
