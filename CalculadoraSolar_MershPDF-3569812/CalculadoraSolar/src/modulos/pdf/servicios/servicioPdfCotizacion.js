import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function formatoMoneda(valor) {
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) return '$0.00';
  return numero.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatoCantidad(valor) {
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) return '0';
  return numero.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function leerCampoLinea(linea, ...claves) {
  for (const clave of claves) {
    const valor = linea?.[clave];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return valor;
    }
  }

  return '';
}

export async function generarPdfCotizacionDesdeApi(datosCotizacion = {}) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]);
  let y = 750;

  const agregarTexto = (texto, opciones = {}) => {
    const {
      x = 45,
      size = 11,
      font = fontRegular,
      color = rgb(0.12, 0.16, 0.21),
      salto = 16,
    } = opciones;

    page.drawText(String(texto || ''), { x, y, size, font, color });
    y -= salto;
  };

  const asegurarEspacio = (espacio = 32) => {
    if (y > espacio) return;
    page = pdfDoc.addPage([612, 792]);
    y = 750;
  };

  const lineas = Array.isArray(datosCotizacion.lines) ? datosCotizacion.lines : [];

  agregarTexto('Cotización', { font: fontBold, size: 18, salto: 28 });
  agregarTexto(`ID: ${datosCotizacion.id || 'N/D'}`, { size: 12 });
  agregarTexto(`Cliente: ${datosCotizacion.customerName || 'N/D'}`, { size: 12 });
  agregarTexto(`Fecha: ${datosCotizacion.date || 'N/D'}`, { size: 12 });
  agregarTexto(`Estado: ${datosCotizacion.status || 'N/D'}`, { size: 12 });
  agregarTexto(`Total: ${formatoMoneda(datosCotizacion.total)}`, { size: 12, font: fontBold, salto: 24 });

  agregarTexto('Detalle de productos', { font: fontBold, size: 13, salto: 18 });

  if (lineas.length === 0) {
    agregarTexto('Sin líneas en la cotización.', { size: 11 });
  } else {
    lineas.forEach((linea, index) => {
      asegurarEspacio(90);
      const codigo = leerCampoLinea(linea, 'Codigo', 'Código', 'Item_Number', 'ItemNumber', 'id');
      const nombre = leerCampoLinea(linea, 'Nombre', 'Name', 'Descripcion', 'Descripción', 'Description') || 'Producto';
      const cantidad = leerCampoLinea(linea, 'Cantidad', 'Quantity', 'Qty', 'Unidades');
      const precio = leerCampoLinea(linea, 'Precio_Unitario', 'Precio', 'Price');
      const totalLinea = leerCampoLinea(linea, 'Total', 'LineTotal');

      agregarTexto(`${index + 1}. ${nombre}`, { font: fontBold, size: 11, salto: 14 });
      agregarTexto(`Código: ${codigo || 'N/D'}`, { size: 10, color: rgb(0.35, 0.4, 0.5), salto: 13 });
      agregarTexto(
        `Cantidad: ${formatoCantidad(cantidad)}  |  Precio: ${formatoMoneda(precio)}  |  Total: ${formatoMoneda(totalLinea)}`,
        { size: 10, color: rgb(0.35, 0.4, 0.5), salto: 16 }
      );
    });
  }

  return pdfDoc.save();
}
