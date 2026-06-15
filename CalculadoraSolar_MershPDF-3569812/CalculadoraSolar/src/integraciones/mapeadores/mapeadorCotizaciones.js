function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstTextValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return '';
}

export function mapearCotizacionInterfuerza(row = {}) {
  const quote = row?.Quote && typeof row.Quote === 'object'
    ? row.Quote
    : row?.quote && typeof row.quote === 'object'
      ? row.quote
      : row;

  return {
    id: firstTextValue(quote.id, quote.ID),
    clienteId: firstTextValue(quote.Cliente, quote.Customer_ID, quote.CustomerID),
    clienteNombre: firstTextValue(quote.Nombre, quote.Customer_Name, quote.CustomerName),
    fecha: firstTextValue(quote.Date, quote.Fecha),
    estado: firstTextValue(quote.Status, quote.Estado),
    total: toNumber(quote.Total),
    raw: row,
  };
}
