import './proposal.css';

/**
 * Resumen económico: subtotal, descuento, IVA, total.
 * @param {object} economic - Resultado de calcularEconomico
 */
export default function PriceSummary({ economic, discountRate, onDiscountChange }) {
  if (!economic) return null;

  return (
    <div className="proposal-card price-summary animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
      <h3 className="proposal-card__title">
        <span className="proposal-card__icon">💰</span>
        Resumen Económico
      </h3>

      <div className="price-summary__rows">
        <div className="price-summary__row">
          <span>Subtotal Productos:</span>
          <span className="price-summary__amount">${economic.subtotal}</span>
        </div>
        <div className="price-summary__row" style={{ alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Descuento (%):
            <input
              type="number"
              min="0"
              max="100"
              value={discountRate}
              onChange={(e) => onDiscountChange(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </span>
          <span className="price-summary__amount price-summary__amount--discount">-${economic.descuento}</span>
        </div>
        <div className="price-summary__row price-summary__row--total">
          <span>TOTAL:</span>
          <span className="price-summary__total">${economic.total}</span>
        </div>
      </div>
    </div>
  );
}
