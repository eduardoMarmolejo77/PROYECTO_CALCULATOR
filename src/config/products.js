const INTERFUERZA_API_URL = import.meta.env.VITE_INTERFUERZA_API_URL || '/api/interfuerza';
const DEFAULT_MAX_PRODUCT_PAGES = 100;

export const CATEGORIES = [{ id: 'all', name: 'Todos' }];
export const PRODUCTS = [];
export const PRODUCT_NAMES = {};

function slugify(value) {
  return String(value || 'sin-categoria')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-categoria';
}

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getProductIcon(product) {
  const text = `${product.Nombre || ''} ${product.Category_L1 || ''} ${product.Category_L2 || ''}`.toLowerCase();

  if (text.includes('panel') || text.includes('solar') || text.includes('fotovolta')) return '☀️';
  if (text.includes('cable') || text.includes('conector')) return '🔌';
  if (text.includes('riel') || text.includes('estructura') || text.includes('soporte')) return '📐';
  if (text.includes('bater')) return '🔋';
  if (text.includes('inversor')) return '⚡';

  return '📦';
}

function getProductPrice(product, priceLists = []) {
  const defaultListPrice = priceLists.find((item) => toNumber(item.Precio) > 0)?.Precio;
  return toNumber(product.Precio_Venta_Real || product.Precio_Venta || defaultListPrice);
}

function getStockRows(item) {
  if (Array.isArray(item.InStock)) return item.InStock;
  if (Array.isArray(item.Stock)) return item.Stock;
  if (Array.isArray(item.Producto?.InStock)) return item.Producto.InStock;
  return [];
}

function firstTextValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return '';
}

function getWarehouseName(row) {
  const directName = firstTextValue(
    row.Bodega,
    row.NombreBodega,
    row.BodegaNombre,
    row.Ubicacion,
    row.Ubicación,
    row.Location,
    row.WarehouseName,
    row.WareHouseName,
    row.WarehouseNombre,
    row.WareHouseNombre,
    row.Almacen,
    row.Almacén,
    row.NombreAlmacen,
    row.NombreAlmacén,
    row.Sucursal
  );

  if (directName) return directName;

  const warehouse = row.WareHouse || row.Warehouse;

  if (!warehouse) return '';

  if (typeof warehouse === 'object') {
    return firstTextValue(
      warehouse.Bodega,
      warehouse.Nombre,
      warehouse.Name,
      warehouse.Ubicacion,
      warehouse.Ubicación,
      warehouse.Location,
      warehouse.Description,
      warehouse.Descripcion,
      warehouse.Descripción,
      warehouse.Sucursal,
      warehouse.Code,
      warehouse.Codigo,
      warehouse.Código,
      warehouse.id
    );
  }

  return String(warehouse);
}

function getProductStock(item) {
  const rows = getStockRows(item);

  return rows.reduce((stock, row) => {
    const available = toNumber(row.Available);
    const inStock = toNumber(row.InStock);
    const reserved = toNumber(row.Reservado);
    const inTransit = toNumber(row.Intransit);
    const display = toNumber(row.Display);
    const warehouseName = getWarehouseName(row);

    if (warehouseName) {
      stock.locations.push({
        name: warehouseName,
        available,
        reserved,
        inStock,
        inTransit,
        display,
      });
    }

    return {
      available: stock.available + available,
      inStock: stock.inStock + inStock,
      reserved: stock.reserved + reserved,
      inTransit: stock.inTransit + inTransit,
      display: stock.display + display,
      warehouses: stock.warehouses + (warehouseName ? 1 : 0),
      warehousesWithAvailable: stock.warehousesWithAvailable + (available > 0 ? 1 : 0),
      locations: stock.locations,
    };
  }, {
    available: 0,
    inStock: 0,
    reserved: 0,
    inTransit: 0,
    display: 0,
    warehouses: 0,
    warehousesWithAvailable: 0,
    locations: [],
  });
}

function getProductDescription(product) {
  return [
    product.Item_Number && `Item: ${product.Item_Number}`,
    product.Marca && `Marca: ${product.Marca}`,
    product.Category_L2,
    product.Category_L3,
  ]
    .filter(Boolean)
    .join(' | ') || product.Type || 'Producto de InterFuerza';
}

export function normalizeProduct(item) {
  const product = item.Producto || item;
  const categoryName = product.Category_L1 || product.Category_L2 || 'Sin categoría';
  const stock = getProductStock(item);

  return {
    id: product.id || product.Item_Number || product.UPC_Code || crypto.randomUUID(),
    name: product.Nombre || product.Item_Number || 'Producto sin nombre',
    price: getProductPrice(product, item.PriceLists || []),
    icon: getProductIcon(product),
    category: slugify(categoryName),
    description: getProductDescription(product),
    stock: stock.available,
    stockTotal: stock.inStock,
    stockReserved: stock.reserved,
    stockInTransit: stock.inTransit,
    stockDisplay: stock.display,
    stockWarehouses: stock.warehouses,
    stockWarehousesWithAvailable: stock.warehousesWithAvailable,
    stockLocations: stock.locations,
    stockWarehouseNames: [...new Set(stock.locations.map((location) => location.name))],
    raw: item,
  };
}

export function normalizeCategory(category) {
  const name = category.Category_L1 || category.Category_L2 || category.Category_L3 || 'Sin categoría';

  return {
    id: slugify(name),
    name,
  };
}

async function callInterfuerza(action, payload = {}) {
  const response = await fetch(INTERFUERZA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      class: 'GET',
      action,
      ...payload,
    }),
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || text || `Error HTTP ${response.status}`);
  }

  return data;
}

function extractQuoteRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const rows = [];
  const directKeys = [
    'quote',
    'Quote',
    'quotes',
    'Quotes',
    'cotizacion',
    'Cotizacion',
    'cotización',
    'Cotización',
    'cotizaciones',
    'Cotizaciones',
  ];

  directKeys.forEach((key) => {
    const value = payload?.[key];
    if (Array.isArray(value)) rows.push(...value);
    else if (value && typeof value === 'object') rows.push(value);
  });

  if (rows.length > 0) return rows;

  const nestedKeys = ['data', 'Data', 'result', 'Result', 'response', 'Response'];
  for (const key of nestedKeys) {
    const nestedRows = extractQuoteRows(payload?.[key]);
    if (nestedRows.length > 0) return nestedRows;
  }

  return payload && typeof payload === 'object' ? [payload] : [];
}

function isQuoteLineLike(row) {
  if (!row || typeof row !== 'object') return false;

  return Boolean(
    row.Codigo ||
    row.Código ||
    row.Item_Number ||
    row.ItemNumber ||
    row.Nombre ||
    row.Name ||
    row.Descripcion ||
    row.Descripción ||
    row.Description ||
    row.Cantidad ||
    row.Quantity ||
    row.Qty
  );
}

function extractQuoteLines(row, fallbackRows = []) {
  const lineKeys = [
    'Lines',
    'lines',
    'Items',
    'items',
    'Products',
    'products',
    'Productos',
    'productos',
    'Details',
    'details',
    'Detalles',
    'detalles',
    'QuoteLines',
    'Quote_Lines',
    'quote_lines',
  ];

  for (const key of lineKeys) {
    const value = row?.[key];
    if (Array.isArray(value)) return value;
  }

  if (Array.isArray(fallbackRows) && fallbackRows.some(isQuoteLineLike)) {
    return fallbackRows.filter(isQuoteLineLike);
  }

  return isQuoteLineLike(row) ? [row] : [];
}

async function fetchProductsPage({ page = 1 } = {}) {
  const data = await callInterfuerza('products', { page: String(page) });
  const products = Array.isArray(data.products) ? data.products : [];
  const count = Number.parseInt(data.count, 10);

  return {
    products: products.map(normalizeProduct),
    count: Number.isFinite(count) ? count : null,
  };
}

export async function fetchProducts({ page = 1 } = {}) {
  const { products } = await fetchProductsPage({ page });
  return products;
}

export async function fetchQuoteById(id) {
  const quoteId = String(id || '').trim();

  if (!quoteId) {
    throw new Error('Ingresa un número de cotización válido.');
  }

  const data = await callInterfuerza('quote', { id: quoteId });
  const rows = extractQuoteRows(data);

  if (rows.length === 0) {
    throw new Error(`No se encontró la cotización ${quoteId} en InterFuerza.`);
  }

  const firstRow = rows[0];
  const quoteHeader = (firstRow?.Quote && typeof firstRow.Quote === 'object')
    ? firstRow.Quote
    : (firstRow?.quote && typeof firstRow.quote === 'object')
      ? firstRow.quote
      : firstRow;
  const lines = extractQuoteLines(firstRow, rows);

  return {
    id: firstTextValue(quoteHeader?.id, quoteHeader?.ID, quoteId),
    customerId: firstTextValue(quoteHeader?.Cliente, quoteHeader?.Customer_ID, quoteHeader?.CustomerID),
    customerName: firstTextValue(quoteHeader?.Nombre, quoteHeader?.Customer_Name, quoteHeader?.CustomerName),
    date: firstTextValue(quoteHeader?.Date, quoteHeader?.Fecha),
    status: firstTextValue(quoteHeader?.Status, quoteHeader?.Estado),
    total: toNumber(quoteHeader?.Total),
    lines,
    raw: data,
  };
}

export async function fetchAllProducts({ maxPages = DEFAULT_MAX_PRODUCT_PAGES } = {}) {
  const catalog = [];
  let expectedCount = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const { products, count } = await fetchProductsPage({ page });
    expectedCount = count ?? expectedCount;
    catalog.push(...products);

    if (products.length === 0) break;
    if (expectedCount !== null && catalog.length >= expectedCount) break;
  }

  return expectedCount === null ? catalog : catalog.slice(0, expectedCount);
}

export async function fetchCategories() {
  const data = await callInterfuerza('categories');
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const unique = new Map();

  for (const category of categories) {
    const normalized = normalizeCategory(category);
    unique.set(normalized.id, normalized);
  }

  return [CATEGORIES[0], ...unique.values()];
}

export async function fetchCatalog() {
  const [products, categoriesFromApi] = await Promise.all([
    fetchAllProducts(),
    fetchCategories().catch(() => CATEGORIES),
  ]);

  const categoriesFromProducts = new Map();

  for (const product of products) {
    if (product.category && !categoriesFromProducts.has(product.category)) {
      const apiCategory = categoriesFromApi.find((category) => category.id === product.category);
      categoriesFromProducts.set(product.category, apiCategory || {
        id: product.category,
        name: product.raw?.Producto?.Category_L1 || product.raw?.Category_L1 || 'Sin categoría',
      });
    }
  }

  const categories = [
    CATEGORIES[0],
    ...new Map(
      [...categoriesFromApi.slice(1), ...categoriesFromProducts.values()]
        .map((category) => [category.id, category])
    ).values(),
  ];

  return { products, categories };
}
