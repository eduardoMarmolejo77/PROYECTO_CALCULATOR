const TIPOS_MONTAJE_PERMITIDOS = new Set(['Losa', 'Piso', 'S-5', 'TPO', 'Teja']);

function aNumero(valor, fallback = Number.NaN) {
  const numero = Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function stringNoVacio(valor) {
  return String(valor || '').trim();
}

export function validarPayloadCotizacion(datos = {}) {
  const errores = [];

  const lineas = Array.isArray(datos.lineasPrecotizacion)
    ? datos.lineasPrecotizacion
    : Array.isArray(datos.lines)
      ? datos.lines
      : [];

  if (lineas.length === 0) {
    errores.push('Debe haber al menos un producto en la cotización.');
  }

  lineas.forEach((linea, index) => {
    const numeroLinea = index + 1;
    const codigo = stringNoVacio(
      linea?.codigo || linea?.Codigo || linea?.Item_Number || linea?.id
    );
    const cantidad = aNumero(linea?.cantidad ?? linea?.Cantidad ?? linea?.Unidades, 0);
    const precio = aNumero(linea?.precioUnitario ?? linea?.Precio_Unitario ?? linea?.precio ?? linea?.Price, -1);

    if (!codigo) {
      errores.push(`La línea ${numeroLinea} no tiene código de producto.`);
    }

    if (!(cantidad > 0)) {
      errores.push(`La línea ${numeroLinea} debe tener cantidad mayor a 0.`);
    }

    if (precio < 0) {
      errores.push(`La línea ${numeroLinea} tiene un precio unitario inválido.`);
    }
  });

  const descuento = aNumero(
    datos.descuentoPorcentajeNormalizado ?? datos.quote?.Discount ?? datos.descuento,
    0
  );
  if (descuento < 0 || descuento > 100) {
    errores.push('El descuento debe estar entre 0 y 100.');
  }

  const total = aNumero(
    datos.totalPrecotizacion ?? datos.total ?? datos.quote?.Total,
    -1
  );
  if (total < 0) {
    errores.push('El total debe ser un valor válido.');
  }

  if (datos.requiereObservacionTecnica && !stringNoVacio(datos.observacionTecnicaFija)) {
    errores.push('La observación técnica no puede estar vacía.');
  }

  const tipoMontaje = stringNoVacio(datos.tipoMontaje);
  if (tipoMontaje && !TIPOS_MONTAJE_PERMITIDOS.has(tipoMontaje)) {
    errores.push('El tipo de montaje no es válido.');
  }

  return errores;
}
