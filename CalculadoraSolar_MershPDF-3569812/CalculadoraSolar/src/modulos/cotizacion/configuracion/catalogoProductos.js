import { llamarApi } from '../../../integraciones/http/clienteApi';
import { crearCacheConTTL } from '../../../integraciones/cache/memoria';

const DEFAULT_MAX_PRODUCT_PAGES = 100;
const DEFAULT_PRODUCT_PAGE_CONCURRENCY = 4;
const DEFAULT_MAX_CUSTOMER_PAGES = 40;
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

export const CATEGORIAS = [{ id: 'all', name: 'Todos' }];
export const PRODUCTOS = [];
export const NOMBRES_PRODUCTOS = {};

const catalogCache = crearCacheConTTL({ ttlMs: CATALOG_CACHE_TTL_MS });
const customersCache = crearCacheConTTL({ ttlMs: CATALOG_CACHE_TTL_MS });

// Compatibilidad con nomenclatura anterior.
export const CATEGORIES = CATEGORIAS;
export const PRODUCTS = PRODUCTOS;
export const PRODUCT_NAMES = NOMBRES_PRODUCTOS;

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

export function normalizeCustomer(customer) {
  return {
    id: firstTextValue(customer?.Cliente, customer?.CustomerID, customer?.id),
    name: firstTextValue(customer?.Nombre, customer?.Name, customer?.Cliente),
    country: firstTextValue(customer?.Pais, customer?.Country),
    status: firstTextValue(customer?.Status, customer?.Estado),
    seller: firstTextValue(customer?.Vendedor),
    raw: customer,
  };
}

async function callApiAction(action, payload = {}, timeoutMs = 30000) {
  const data = await llamarApi({
    payload: {
      class: 'GET',
      action,
      ...payload,
    },
    timeoutMs,
  });

  if (typeof data?.error === 'string' && data.error.trim()) {
    throw new Error(data.error);
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

  return [];
}

function quoteRowId(row) {
  if (!row || typeof row !== 'object') return '';
  const nestedQuote = row?.Quote && typeof row.Quote === 'object'
    ? row.Quote
    : row?.quote && typeof row.quote === 'object'
      ? row.quote
      : row;

  return firstTextValue(nestedQuote?.id, nestedQuote?.ID);
}

function encontrarCotizacionEnListado(data, quoteId) {
  const rows = extractQuoteRows(data);
  const target = String(quoteId || '').trim().toLowerCase();
  return rows.find((row) => quoteRowId(row).toLowerCase() === target) || null;
}

async function fetchQuoteFromQuotesAction(quoteId, maxPages = 80) {
  let emptyPagesInRow = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await callApiAction('quotes', { page: String(page) }, 15000);
    const row = encontrarCotizacionEnListado(data, quoteId);
    if (row) return row;

    const rows = extractQuoteRows(data);
    if (rows.length === 0) {
      emptyPagesInRow += 1;
      if (emptyPagesInRow >= 2) break;
      continue;
    }

    emptyPagesInRow = 0;
  }

  return null;
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
  const data = await callApiAction('products', { page: String(page) });
  const products = Array.isArray(data.products) ? data.products : [];
  const count = Number.parseInt(data.count, 10);

  return {
    products: products.map(normalizeProduct),
    count: Number.isFinite(count) && count > 0 ? count : null,
  };
}

async function fetchCustomersPage({ page = 1 } = {}) {
  const data = await callApiAction('customers', { page: String(page) });
  const customers = Array.isArray(data.customers) ? data.customers : [];
  const count = Number.parseInt(data.count, 10);

  return {
    customers: customers.map(normalizeCustomer).filter((item) => item.id),
    count: Number.isFinite(count) && count > 0 ? count : null,
  };
}

export async function fetchProducts({ page = 1 } = {}) {
  const { products } = await fetchProductsPage({ page });
  return products;
}

export async function fetchCustomers({ page = 1 } = {}) {
  const { customers } = await fetchCustomersPage({ page });
  return customers;
}

async function fetchProductPagesInBatches(pageNumbers, concurrency) {
  const pages = [];

  for (let index = 0; index < pageNumbers.length; index += concurrency) {
    const batch = pageNumbers.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (page) => ({
        page,
        ...(await fetchProductsPage({ page })),
      }))
    );
    pages.push(...batchResults);
  }

  return pages.sort((a, b) => a.page - b.page);
}

export async function fetchQuoteById(id) {
  const quoteId = String(id || '').trim();

  if (!quoteId) {
    throw new Error('Ingresa un número de cotización válido.');
  }

  const data = await callApiAction('quote', { id: quoteId }, 15000);
  const rows = extractQuoteRows(data);
  let firstRow = rows.find((row) => quoteRowId(row).toLowerCase() === quoteId.toLowerCase()) || null;

  if (!firstRow) {
    firstRow = await fetchQuoteFromQuotesAction(quoteId);
  }

  if (!firstRow) {
    throw new Error(`No se encontró la cotización ${quoteId} en la API. Verifica permisos del token para lectura de cotizaciones.`);
  }

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

export async function fetchAllProducts({
  maxPages = DEFAULT_MAX_PRODUCT_PAGES,
  concurrency = DEFAULT_PRODUCT_PAGE_CONCURRENCY,
} = {}) {
  const firstPage = await fetchProductsPage({ page: 1 });
  const catalog = [...firstPage.products];
  const expectedCount = firstPage.count;

  if (firstPage.products.length === 0) return [];

  if (expectedCount !== null) {
    const totalPages = Math.min(maxPages, Math.ceil(expectedCount / firstPage.products.length));
    const remainingPages = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => index + 2);
    const pageResults = await fetchProductPagesInBatches(remainingPages, concurrency);

    pageResults.forEach(({ products }) => {
      catalog.push(...products);
    });

    return catalog.slice(0, expectedCount);
  }

  for (let page = 2; page <= maxPages; page += 1) {
    const { products } = await fetchProductsPage({ page });
    if (products.length === 0) break;
    catalog.push(...products);
  }

  return catalog;
}

export async function fetchAllCustomers({ maxPages = DEFAULT_MAX_CUSTOMER_PAGES } = {}) {
  const firstPage = await fetchCustomersPage({ page: 1 });
  const customers = [...firstPage.customers];
  const expectedCount = firstPage.count;

  if (firstPage.customers.length === 0) return [];

  if (expectedCount !== null) {
    const totalPages = Math.min(maxPages, Math.ceil(expectedCount / firstPage.customers.length));
    for (let page = 2; page <= totalPages; page += 1) {
      const { customers: pageCustomers } = await fetchCustomersPage({ page });
      customers.push(...pageCustomers);
    }
  } else {
    for (let page = 2; page <= maxPages; page += 1) {
      const { customers: pageCustomers } = await fetchCustomersPage({ page });
      if (pageCustomers.length === 0) break;
      customers.push(...pageCustomers);
    }
  }

  return [...new Map(customers.map((customer) => [customer.id, customer])).values()];
}

export async function fetchCategories() {
  const data = await callApiAction('categories');
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const unique = new Map();

  for (const category of categories) {
    const normalized = normalizeCategory(category);
    unique.set(normalized.id, normalized);
  }

  return [CATEGORIAS[0], ...unique.values()];
}

export async function fetchCatalog({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cacheActual = catalogCache.obtener();
    if (cacheActual) return cacheActual;
  }

  if (!forceRefresh) {
    const promesaActiva = catalogCache.obtenerPromesaActiva();
    if (promesaActiva) return promesaActiva;
  }

  const solicitudCatalogo = (async () => {
    const [products, categoriesFromApi, customers] = await Promise.all([
      fetchAllProducts(),
      fetchCategories().catch(() => CATEGORIAS),
      fetchAllCustomers().catch(() => []),
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
      CATEGORIAS[0],
      ...new Map(
        [...categoriesFromApi.slice(1), ...categoriesFromProducts.values()]
          .map((category) => [category.id, category])
      ).values(),
    ];

    customersCache.guardar(customers);
    return catalogCache.guardar({ products, categories, customers });
  })();

  catalogCache.fijarPromesaActiva(solicitudCatalogo);

  try {
    return await solicitudCatalogo;
  } finally {
    catalogCache.limpiarPromesaActiva();
  }
}

export function getCachedCatalog() {
  return catalogCache.obtener();
}

export async function fetchCustomersCatalog({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cacheActual = customersCache.obtener();
    if (cacheActual) return cacheActual;
  }

  if (!forceRefresh) {
    const promesaActiva = customersCache.obtenerPromesaActiva();
    if (promesaActiva) return promesaActiva;
  }

  const solicitudClientes = (async () => {
    const customers = await fetchAllCustomers();
    return customersCache.guardar(customers);
  })();

  customersCache.fijarPromesaActiva(solicitudClientes);

  try {
    return await solicitudClientes;
  } finally {
    customersCache.limpiarPromesaActiva();
  }
}

export function getCachedCustomers() {
  return customersCache.obtener();
}

export function preloadCatalog() {
  return fetchCatalog().catch((error) => {
    console.warn('No se pudo precargar el catálogo:', error);
    return null;
  });
}

// API pública en español para el resto del proyecto.
export const normalizarProducto = normalizeProduct;
export const normalizarCategoria = normalizeCategory;
export const normalizarCliente = normalizeCustomer;
export const obtenerProductos = fetchProducts;
export const obtenerClientesPorPagina = fetchCustomers;
export const obtenerClientes = fetchCustomersCatalog;
export const obtenerClientesEnCache = getCachedCustomers;
export const obtenerCotizacionPorId = fetchQuoteById;
export const obtenerTodosLosProductos = fetchAllProducts;
export const obtenerTodosLosClientes = fetchAllCustomers;
export const obtenerCategorias = fetchCategories;
export const obtenerCatalogo = fetchCatalog;
export const obtenerCatalogoEnCache = getCachedCatalog;
export const precargarCatalogo = preloadCatalog;
