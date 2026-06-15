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

export function mapearProductoInterfuerza(item) {
  const product = item?.Producto || item || {};
  const priceList = Array.isArray(item?.PriceLists)
    ? item.PriceLists.find((row) => toNumber(row.Precio) > 0)
    : null;

  return {
    id: firstTextValue(product.id, product.Item_Number, product.UPC_Code),
    nombre: firstTextValue(product.Nombre, product.Item_Number),
    descripcion: firstTextValue(product.Descripcion, product.Detalle, product.Type),
    marca: firstTextValue(product.Marca),
    precio: toNumber(product.Precio_Venta_Real || product.Precio_Venta || priceList?.Precio),
    categoriaL1: firstTextValue(product.Category_L1),
    categoriaL2: firstTextValue(product.Category_L2),
    categoriaL3: firstTextValue(product.Category_L3),
    itemNumber: firstTextValue(product.Item_Number),
    raw: item,
  };
}
