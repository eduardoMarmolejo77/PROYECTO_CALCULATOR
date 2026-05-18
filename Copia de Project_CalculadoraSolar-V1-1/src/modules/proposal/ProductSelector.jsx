import { useState, useMemo } from 'react';
import './proposal.css';

const MAX_VISIBLE = 20;
const RAW_SEARCH_VALUE_LIMIT = 80;

function formatStockValue(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[+_/\\|:;,.()[\]{}"'`]+/g, ' ')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactSearchText(value) {
  return normalizeSearchText(value).replace(/\s+/g, '');
}

function getSearchTokens(value) {
  return normalizeSearchText(value).split(' ').filter(Boolean);
}

function collectRawSearchValues(value, values = [], seen = new Set(), depth = 0) {
  if (
    value === null ||
    value === undefined ||
    depth > 4 ||
    values.length >= RAW_SEARCH_VALUE_LIMIT
  ) {
    return values;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    if (text) values.push(text);
    return values;
  }

  if (typeof value !== 'object' || seen.has(value)) {
    return values;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectRawSearchValues(item, values, seen, depth + 1));
    return values;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    values.push(key);
    collectRawSearchValues(nestedValue, values, seen, depth + 1);
  });

  return values;
}

function buildProductSearchIndex(product) {
  const coreValues = [
    product.id,
    product.name,
    product.description,
    product.category,
    product.icon,
    ...(product.stockWarehouseNames || []),
  ];

  const rawValues = collectRawSearchValues(product.raw);
  const haystack = normalizeSearchText([...coreValues, ...rawValues].join(' '));
  const compactHaystack = compactSearchText([...coreValues, ...rawValues].join(' '));
  const exactFields = {
    id: normalizeSearchText(product.id),
    name: normalizeSearchText(product.name),
    description: normalizeSearchText(product.description),
  };

  return { product, haystack, compactHaystack, exactFields };
}

function getSearchScore(indexedProduct, searchValue) {
  const tokens = getSearchTokens(searchValue);
  if (tokens.length === 0) return 0;

  const query = normalizeSearchText(searchValue);
  const compactQuery = compactSearchText(searchValue);
  const { haystack, compactHaystack, exactFields, product } = indexedProduct;

  const matchesAllTokens = tokens.every((token) => {
    const compactToken = compactSearchText(token);
    return haystack.includes(token) || compactHaystack.includes(compactToken);
  });

  if (!matchesAllTokens) return -1;

  let score = 0;

  tokens.forEach((token) => {
    const compactToken = compactSearchText(token);

    if (exactFields.id.includes(token) || compactSearchText(product.id).includes(compactToken)) {
      score += 20;
    }

    if (exactFields.name.includes(token)) {
      score += 12;
    }

    if (exactFields.description.includes(token)) {
      score += 8;
    }

    if (haystack.includes(token)) {
      score += 3;
    }

    if (compactHaystack.includes(compactToken)) {
      score += 2;
    }
  });

  if (exactFields.id === query || compactSearchText(product.id) === compactQuery) score += 60;
  if (exactFields.id.startsWith(query) || compactSearchText(product.id).startsWith(compactQuery)) score += 35;
  if (exactFields.name.includes(query)) score += 24;
  if (exactFields.description.includes(query)) score += 16;
  if (compactHaystack.includes(compactQuery)) score += 10;

  return score;
}

function getRawWarehouseLocations(product) {
  const rows = product.raw?.InStock || product.raw?.Stock || product.raw?.Producto?.InStock || [];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => ({
      name: row.WareHouse || row.Warehouse || row.Bodega || row.Ubicacion || row.Ubicación || row.Location,
      available: Number(row.Available || 0),
      reserved: Number(row.Reservado || 0),
      inStock: Number(row.InStock || 0),
      inTransit: Number(row.Intransit || 0),
      display: Number(row.Display || 0),
    }))
    .map((location) => ({ ...location, name: String(location.name || '').trim() }))
    .filter((location) => location.name);
}

function uniqueNames(locations) {
  return [...new Set(locations.map((location) => location.name).filter(Boolean))];
}

function hasQuantity(location) {
  return Number(location.available || 0) > 0 ||
    Number(location.reserved || 0) > 0 ||
    Number(location.inStock || 0) > 0 ||
    Number(location.inTransit || 0) > 0 ||
    Number(location.display || 0) > 0;
}

function getWarehouseLabel(product) {
  const normalizedLocations = Array.isArray(product.stockLocations) ? product.stockLocations : [];
  const rawLocations = getRawWarehouseLocations(product);
  const locations = [...normalizedLocations, ...rawLocations];
  const locationsWithQuantity = locations.filter(hasQuantity);
  const namesWithQuantity = uniqueNames(locationsWithQuantity);

  if (namesWithQuantity.length > 0) return namesWithQuantity.join(', ');

  const fallbackNames = uniqueNames(locations);
  if (fallbackNames.length > 0) return fallbackNames[0];

  return 'Sin ubicación';
}

/**
 * Selector de productos con buscador, filtro por categoría y lista scrollable.
 * Diseñado para manejar 1000+ productos eficientemente.
 * 
 * @param {boolean} readOnly - Si true, solo muestra búsqueda sin permitir seleccionar
 */
export default function ProductSelector({
  products = [],
  categories = [{ id: 'all', name: 'Todos' }],
  selected,
  onToggle,
  onUpdateQuantity,
  loading,
  error,
  readOnly = false,
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const indexedProducts = useMemo(() => products.map(buildProductSearchIndex), [products]);

  // Filtrar productos
  const filtered = useMemo(() => {
    let items = indexedProducts;

    if (category !== 'all') {
      items = items.filter(({ product }) => product.category === category);
    }

    if (search.trim()) {
      items = items
        .map((indexedProduct, index) => ({
          indexedProduct,
          index,
          score: getSearchScore(indexedProduct, search),
        }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(({ indexedProduct }) => indexedProduct);
    }

    return items.map(({ product }) => product);
  }, [indexedProducts, search, category]);

  // Limitar renderizado
  const visible = filtered.slice(0, MAX_VISIBLE);
  const remaining = filtered.length - MAX_VISIBLE;

  // Productos seleccionados con sus cantidades
  const selectedItems = useMemo(
    () => products.filter((p) => selected[p.id]).map(p => ({ ...p, quantity: selected[p.id] })),
    [products, selected]
  );

  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, p) => sum + (p.price * p.quantity), 0),
    [selectedItems]
  );

  const selectedCount = Object.keys(selected).length;

  // Título dinámico según el modo
  const titleText = readOnly ? 'Búsqueda de Productos' : 'Selección de Productos';

  return (
    <div className="proposal-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <h3 className="proposal-card__title">
        <span className="proposal-card__icon">📦</span>
        {titleText}
        {!readOnly && selectedCount > 0 && (
          <span className="product-selector__badge">{selectedCount}</span>
        )}
      </h3>

      {/* Buscador */}
      <div className="product-selector__search-row">
        <div className="product-selector__search-wrapper">
          <span className="product-selector__search-icon">🔍</span>
          <input
            type="text"
            className="product-selector__search"
            placeholder="Buscar por marca, modelo, código, descripción o ubicación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="product-selector__search-clear"
              onClick={() => setSearch('')}
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filtro de categorías */}
      <div className="product-selector__categories">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`product-selector__cat-btn ${category === cat.id ? 'product-selector__cat-btn--active' : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Contador de resultados */}
      <div className="product-selector__count">
        {loading
          ? 'Cargando productos desde InterFuerza...'
          : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {error && (
        <div className="proposal-error proposal-error--compact">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Lista de productos (scrollable) */}
      <div className="product-selector__list">
        {visible.length === 0 ? (
          <div className="product-selector__empty">
            <span>{loading ? '⏳' : '📭'}</span>
            <p>{loading ? 'Consultando catálogo...' : 'No se encontraron productos'}</p>
          </div>
        ) : (
          visible.map((product) => {
            const quantity = selected[product.id] || 0;
            const isSelected = quantity > 0;
            const hasStock = Number.isFinite(product.stock);
            const hasReserved = Number.isFinite(product.stockReserved);
            return (
              <div
                key={product.id}
                className={`product-list-item ${isSelected ? 'product-list-item--selected' : ''} ${readOnly ? 'product-list-item--readonly' : ''}`}
                onClick={() => !isSelected && !readOnly && onToggle(product.id)}
              >
                <span className="product-list-item__icon">{product.icon}</span>
                <div className="product-list-item__info">
                  <span className="product-list-item__name">{product.name}</span>
                  <span className="product-list-item__desc">{product.description}</span>
                  {hasStock && (
                    <div className="product-list-item__stock-meta">
                      <span className={`product-list-item__stock ${product.stock > 0 ? 'product-list-item__stock--available' : ''}`}>
                        Disponible: {formatStockValue(product.stock)}
                      </span>
                      {hasReserved && (
                        <span className="product-list-item__stock">
                          Reservado: {formatStockValue(product.stockReserved)}
                        </span>
                      )}
                      <span className="product-list-item__warehouse" title={`Ubicacion = ${getWarehouseLabel(product)}`}>
                        Ubicacion = {getWarehouseLabel(product)}
                      </span>
                    </div>
                  )}
                </div>
                
                {!readOnly && isSelected ? (
                  <div className="product-list-item__qty-control" onClick={(e) => e.stopPropagation()}>
                    <button 
                      type="button" 
                      onClick={() => onUpdateQuantity(product.id, Math.max(0, quantity - 1))}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        onUpdateQuantity(product.id, isNaN(val) ? 0 : val);
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                    <button 
                      type="button" 
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="product-list-item__price">${product.price.toLocaleString()}</span>
                )}

                {!readOnly && (
                  <span 
                    className={`product-list-item__check ${isSelected ? 'product-list-item__check--visible' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(product.id);
                    }}
                  >
                    {isSelected ? '✓' : '+'}
                  </span>
                )}
              </div>
            );
          })
        )}
        {remaining > 0 && (
          <div className="product-selector__more">
            +{remaining} productos más — refina tu búsqueda para verlos
          </div>
        )}
      </div>

      {/* Resumen de seleccionados */}
      {!readOnly && selectedItems.length > 0 && (
        <div className="product-selector__selected">
          <div className="product-selector__selected-header">
            <strong>🛒 Resumen de Selección</strong>
            <span className="product-selector__selected-total">${selectedTotal.toLocaleString()}</span>
          </div>
          <div className="product-selector__selected-summary-list">
            {selectedItems.map((p) => (
              <div key={p.id} className="product-summary-row">
                <span className="product-summary-row__name">{p.name}</span>
                <div className="product-summary-row__details">
                  <span className="product-summary-row__price">${p.price.toLocaleString()} x {p.quantity}</span>
                  <span className="product-summary-row__total">${(p.price * p.quantity).toLocaleString()}</span>
                  <button
                    className="product-summary-row__remove"
                    onClick={() => onToggle(p.id)}
                    title="Quitar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
