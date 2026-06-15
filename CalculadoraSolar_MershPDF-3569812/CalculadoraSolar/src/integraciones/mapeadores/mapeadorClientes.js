function firstTextValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return '';
}

export function mapearClienteInterfuerza(customer = {}) {
  return {
    id: firstTextValue(customer.Cliente, customer.CustomerID, customer.id),
    nombre: firstTextValue(customer.Nombre, customer.Name, customer.Cliente),
    pais: firstTextValue(customer.Pais, customer.Country),
    estado: firstTextValue(customer.Status, customer.Estado),
    vendedor: firstTextValue(customer.Vendedor),
    raw: customer,
  };
}
