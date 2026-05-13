const INTERFUERZA_API_URL = import.meta.env.VITE_INTERFUERZA_API_URL || '/api/interfuerza';

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

  return {
    id: product.id || product.Item_Number || product.UPC_Code || crypto.randomUUID(),
    name: product.Nombre || product.Item_Number || 'Producto sin nombre',
    price: getProductPrice(product, item.PriceLists || []),
    icon: getProductIcon(product),
    category: slugify(categoryName),
    description: getProductDescription(product),
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

export async function fetchProducts({ page = 1 } = {}) {
  const data = await callInterfuerza('products', { page: String(page) });
  const products = Array.isArray(data.products) ? data.products : [];

  return products.map(normalizeProduct);
}

export async function fetchAllProducts({ maxPages = 18 } = {}) {
  const catalog = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const products = await fetchProducts({ page });
    catalog.push(...products);

    if (products.length < 25) break;
  }

  return catalog;
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
