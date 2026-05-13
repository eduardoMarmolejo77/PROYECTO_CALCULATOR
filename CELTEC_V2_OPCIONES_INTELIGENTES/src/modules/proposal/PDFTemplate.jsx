/**
 * Genera el HTML template para el PDF.
 * @param {object} params - Todos los datos de la propuesta
 * @returns {string} HTML string
 */
export function generatePDFTemplate({ clientData, quoteNumber, selectedProducts, products = [], economic }) {
  const selectedItems = products.filter((p) => selectedProducts[p.id]).map(p => ({
    ...p,
    quantity: selectedProducts[p.id]
  }));

  const itemsRows = selectedItems
    .map(
      (p) => `
        <tr style="border-bottom: 1px solid #D9DEE3;">
          <td style="padding: 15px 10px;">
            <div style="font-size: 10px; color: #7C8A96; margin-bottom: 4px;">Código: ${p.id.toUpperCase()} | Marca: Genérica</div>
            <div style="font-size: 12px; color: #243746;">${p.name}</div>
          </td>
          <td style="padding: 15px 10px; text-align: center; color: #7C8A96; font-size: 12px;">${p.quantity.toFixed(2)}</td>
          <td style="padding: 15px 10px; text-align: center; color: #7C8A96; font-size: 12px;">$${p.price.toFixed(2)}</td>
          <td style="padding: 15px 10px; text-align: right; color: #243746; font-weight: bold; font-size: 12px;">$${(p.price * p.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const fecha = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155; background-color: #ffffff;">
      
      <!-- ENCABEZADO -->
      <table style="width: 100%; margin-bottom: 30px;">
        <tr>
          <td style="width: 50%;">
            <h1 style="color: #243746; font-size: 36px; font-weight: 300; letter-spacing: 2px; margin: 0;">COTIZACIÓN</h1>
          </td>
          <td style="width: 50%; text-align: right;">
            <span style="color: #7C8A96; font-size: 16px;">R-10-01</span>
          </td>
        </tr>
      </table>

      <!-- DATOS CLIENTE Y COTIZACIÓN -->
      <table style="width: 100%; margin-bottom: 40px; font-size: 12px; color: #64748b;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p style="margin: 0 0 5px 0;">Cotizado A:</p>
            <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: bold; color: #243746;">${clientData.cliente.toUpperCase()}</p>
            <p style="margin: 0 0 2px 0;">RUC: ${clientData.ruc || 'No especificado'}</p>
            <p style="margin: 0 0 2px 0;">${clientData.direccion || '-- Sin dirección --'}</p>
            <p style="margin: 0 0 2px 0;">Contacto: ${clientData.contacto}</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p style="margin: 0 0 5px 0;">Cotización:</p>
            <p style="margin: 0 0 2px 0; font-size: 14px; color: #243746;"># ${quoteNumber}</p>
            <p style="margin: 0 0 2px 0;">Fecha: ${fecha}</p>
            <p style="margin: 0 0 2px 0;">Bodega: Bodega Principal</p>
            <p style="margin: 0 0 2px 0;">Vendedor: Asignado</p>
          </td>
        </tr>
      </table>

      <!-- TABLA DE PRODUCTOS -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead style="display: table-header-group;">
          <tr style="background-color: #D9DEE3; color: #243746; font-size: 12px;">
            <th style="padding: 12px 10px; text-align: left; font-weight: 600; border: 1px solid #ffffff;">Descripción</th>
            <th style="padding: 12px 10px; text-align: center; font-weight: 600; border: 1px solid #ffffff; width: 15%;">Unidades</th>
            <th style="padding: 12px 10px; text-align: center; font-weight: 600; border: 1px solid #ffffff; width: 15%;">Precio</th>
            <th style="padding: 12px 10px; text-align: right; font-weight: 600; border: 1px solid #ffffff; width: 15%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- PIE DE PÁGINA (TOTALES) -->
      <table class="avoid-break" style="width: 100%; font-size: 12px; color: #64748b;">
        <tr>
          <td style="width: 60%; vertical-align: top; padding-right: 20px;">
            <p style="font-size: 14px; font-weight: bold; color: #243746; margin: 0 0 10px 0;">Notas adicionales:</p>
            <p style="margin: 0; line-height: 1.5; color: #7C8A96; white-space: pre-wrap;">${clientData.proyecto}</p>
          </td>
          <td style="width: 40%; vertical-align: bottom;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 10px; text-align: left;">Sub-Total:</td>
                <td style="padding: 5px 10px; text-align: right; color: #243746;">$${economic.subtotal}</td>
              </tr>
              <tr>
                <td style="padding: 5px 10px; text-align: left;">Descuento:</td>
                <td style="padding: 5px 10px; text-align: right; color: #243746;">-$${economic.descuento}</td>
              </tr>
              <tr>
                <td style="padding: 5px 10px; text-align: left;">Otros:</td>
                <td style="padding: 5px 10px; text-align: right; color: #243746;">$0.00</td>
              </tr>
              <tr>
                <td style="padding: 5px 10px; text-align: left;">Impuestos:</td>
                <td style="padding: 5px 10px; text-align: right; color: #243746;">$0.00</td>
              </tr>
              <tr style="background-color: #D9DEE3; font-weight: bold; color: #243746; font-size: 14px;">
                <td style="padding: 10px;">Total:</td>
                <td style="padding: 10px; text-align: right; font-size: 18px;">$${economic.total}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

    </div>
  `;
}
