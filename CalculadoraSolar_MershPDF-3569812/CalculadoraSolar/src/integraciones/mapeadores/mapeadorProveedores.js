function firstTextValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return '';
}

export function mapearProveedorInterfuerza(provider = {}) {
  return {
    id: firstTextValue(
      provider.id,
      provider.ProviderID,
      provider.ProviderId,
      provider.Provider,
      provider.SupplierID,
      provider.SupplierId,
      provider.ProveedorID,
      provider.Proveedor,
      provider.Codigo
    ),
    nombre: firstTextValue(
      provider.Nombre,
      provider.Name,
      provider.Provider,
      provider.Supplier,
      provider.Proveedor,
      provider.Razon_Social,
      provider.RazonSocial
    ),
    estado: firstTextValue(provider.Status, provider.Estado),
    raw: provider,
  };
}
