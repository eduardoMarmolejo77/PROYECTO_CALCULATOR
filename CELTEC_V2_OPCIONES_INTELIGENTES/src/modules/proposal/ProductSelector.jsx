import { useState, useMemo } from 'react';
import './proposal.css';

const MAX_VISIBLE = 20;

/**
 * Selector de productos con buscador, filtro por categoría y lista scrollable.
 * Diseñado para manejar 1000+ productos eficientemente.
 */
export default function ProductSelector({
  products = [],
  categories = [{ id: 'all', name: 'Todos' }],
  selected,
  onToggle,
  onUpdateQuantity,
  loading,
  error,
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  // Filtrar productos
  const filtered = useMemo(() => {
    let items = products;

    if (category !== 'all') {
      items = items.filter((p) => p.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return items;
  }, [products, search, category]);

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

  return (
    <div className="proposal-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <h3 className="proposal-card__title">
        <span className="proposal-card__icon">📦</span>
        Selección de Productos
        {selectedCount > 0 && (
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
            placeholder="Buscar por nombre, código o descripción..."
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
            return (
              <div
                key={product.id}
                className={`product-list-item ${isSelected ? 'product-list-item--selected' : ''}`}
                onClick={() => !isSelected && onToggle(product.id)}
              >
                <span className="product-list-item__icon">{product.icon}</span>
                <div className="product-list-item__info">
                  <span className="product-list-item__name">{product.name}</span>
                  <span className="product-list-item__desc">{product.description}</span>
                </div>
                
                {isSelected ? (
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

                <span 
                  className={`product-list-item__check ${isSelected ? 'product-list-item__check--visible' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(product.id);
                  }}
                >
                  {isSelected ? '✓' : '+'}
                </span>
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
      {selectedItems.length > 0 && (
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
