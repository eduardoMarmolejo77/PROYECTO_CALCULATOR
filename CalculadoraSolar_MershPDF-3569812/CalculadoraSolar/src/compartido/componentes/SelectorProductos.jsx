import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildProductSearchIndex,
  getSearchScore,
} from '../utils/busquedaProductos';

const MAX_VISIBLE = 20;

function formatStockValue(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
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
 * @param {boolean} soloLectura - Si true, solo muestra búsqueda sin permitir seleccionar
 */
export default function SelectorProductos({
  productos = [],
  categorias = [{ id: 'all', name: 'Todos' }],
  seleccionados,
  alAlternarProducto,
  alActualizarCantidad,
  cargando,
  error,
  soloLectura = false,
  autoFocusBusqueda = false,
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const inputBusquedaRef = useRef(null);
  const indexedProducts = useMemo(() => productos.map(buildProductSearchIndex), [productos]);

  useEffect(() => {
    if (!autoFocusBusqueda) return;

    const timer = window.setTimeout(() => {
      inputBusquedaRef.current?.focus();
      inputBusquedaRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocusBusqueda]);

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
    () => productos.filter((p) => seleccionados[p.id]).map(p => ({ ...p, quantity: seleccionados[p.id] })),
    [productos, seleccionados]
  );

  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, p) => sum + (p.price * p.quantity), 0),
    [selectedItems]
  );

  const selectedCount = Object.keys(seleccionados).length;

  // Título dinámico según el modo
  const titleText = soloLectura ? 'Búsqueda de Productos' : 'Selección de Productos';

  return (
    <div className="tarjeta-propuesta animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <h3 className="tarjeta-propuesta__titulo">
        <span className="tarjeta-propuesta__icono">📦</span>
        {titleText}
        {!soloLectura && selectedCount > 0 && (
          <span className="selector-productos__distintivo">{selectedCount}</span>
        )}
      </h3>

      {/* Buscador */}
      <div className="selector-productos__fila-busqueda">
        <div className="selector-productos__envoltura-busqueda">
          <span className="selector-productos__icono-busqueda">🔍</span>
          <input
            ref={inputBusquedaRef}
            type="text"
            className="selector-productos__busqueda"
            placeholder="Buscar por marca, modelo, código, descripción o ubicación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="selector-productos__limpiar-busqueda"
              onClick={(evento) => {
                evento.stopPropagation();
                setSearch('');
              }}
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filtro de categorías */}
      <div className="selector-productos__categorias">
        {categorias.map((cat) => (
          <button
            type="button"
            key={cat.id}
            className={`selector-productos__boton-categoria ${category === cat.id ? 'selector-productos__boton-categoria--activo' : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Contador de resultados */}
      <div className="selector-productos__conteo">
        {cargando
          ? 'Cargando productos desde InterFuerza...'
          : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {error && (
        <div className="alerta-propuesta alerta-propuesta--compacta">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Lista de productos (scrollable) */}
      <div className="selector-productos__lista">
        {visible.length === 0 ? (
          <div className="selector-productos__vacio">
            <span>{cargando ? '⏳' : '📭'}</span>
            <p>{cargando ? 'Consultando catálogo...' : 'No se encontraron productos'}</p>
          </div>
        ) : (
          visible.map((product) => {
            const quantity = seleccionados[product.id] || 0;
            const isSelected = quantity > 0;
            const hasStock = Number.isFinite(product.stock);
            const hasReserved = Number.isFinite(product.stockReserved);
            return (
              <div
                key={product.id}
                className={`elemento-producto ${isSelected ? 'elemento-producto--seleccionado' : ''} ${soloLectura ? 'elemento-producto--solo-lectura' : ''}`}
                onClick={() => !isSelected && !soloLectura && alAlternarProducto(product.id)}
              >
                <span className="elemento-producto__icono">{product.icon}</span>
                <div className="elemento-producto__info">
                  <span className="elemento-producto__nombre">{product.name}</span>
                  <span className="elemento-producto__descripcion">{product.description}</span>
                  {hasStock && (
                    <div className="elemento-producto__meta-stock">
                      <span className={`elemento-producto__stock ${product.stock > 0 ? 'elemento-producto__stock--disponible' : ''}`}>
                        Disponible: {formatStockValue(product.stock)}
                      </span>
                      {hasReserved && (
                        <span className="elemento-producto__stock">
                          Reservado: {formatStockValue(product.stockReserved)}
                        </span>
                      )}
                      <span className="elemento-producto__bodega" title={`Ubicacion = ${getWarehouseLabel(product)}`}>
                        Ubicacion = {getWarehouseLabel(product)}
                      </span>
                    </div>
                  )}
                </div>
                
                {!soloLectura && isSelected ? (
                  <div className="elemento-producto__control-cantidad" onClick={(e) => e.stopPropagation()}>
                    <button 
                      type="button" 
                      onClick={() => alActualizarCantidad(product.id, Math.max(0, quantity - 1))}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        alActualizarCantidad(product.id, isNaN(val) ? 0 : val);
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                    <button 
                      type="button" 
                      onClick={() => alActualizarCantidad(product.id, quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="elemento-producto__precio">${product.price.toLocaleString()}</span>
                )}

                {!soloLectura && (
                  <span 
                    className={`elemento-producto__check ${isSelected ? 'elemento-producto__check--visible' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      alAlternarProducto(product.id);
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
          <div className="selector-productos__mas">
            +{remaining} productos más — refina tu búsqueda para verlos
          </div>
        )}
      </div>

      {/* Resumen de seleccionados */}
      {!soloLectura && selectedItems.length > 0 && (
        <div className="selector-productos__seleccionados">
          <div className="selector-productos__encabezado-seleccion">
            <strong>🛒 Resumen de Selección</strong>
            <span className="selector-productos__total-seleccion">${selectedTotal.toLocaleString()}</span>
          </div>
          <div className="selector-productos__lista-resumen-seleccion">
            {selectedItems.map((p) => (
              <div key={p.id} className="fila-resumen-producto">
                <span className="fila-resumen-producto__nombre">{p.name}</span>
                <div className="fila-resumen-producto__detalles">
                  <span className="fila-resumen-producto__precio">${p.price.toLocaleString()} x {p.quantity}</span>
                  <span className="fila-resumen-producto__total">${(p.price * p.quantity).toLocaleString()}</span>
                  <button
                    type="button"
                    className="fila-resumen-producto__quitar"
                    onClick={() => alAlternarProducto(p.id)}
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
