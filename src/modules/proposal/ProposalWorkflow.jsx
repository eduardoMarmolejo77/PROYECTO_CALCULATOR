import { useState } from 'react';
import SmartCalculator from './SmartCalculator';
import ProductSelector from './ProductSelector';
import Button from '../../components/common/Button';
import QuotePdfUploader from './QuotePdfUploader';
import PDFGenerator from './PDFGenerator';
import Navbar from '../../components/layout/Navbar';
import './proposal.css';

/**
 * Orquestador de los 3 menús del flujo de propuestas
 * Menú 1: Calculadora Solar
 * Menú 2: Recomendaciones IA
 * Menú 3: Merge de PDF
 */
export default function ProposalWorkflow({ products, categories, catalogLoading, catalogError }) {
  const [currentMenu, setCurrentMenu] = useState('calculator'); // 'calculator' | 'recommendations' | 'merge'
  const [smartResults, setSmartResults] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [quotePdf, setQuotePdf] = useState(null);
  const [quoteNumber] = useState(() => {
    const num = Math.floor(Math.random() * 90000) + 10000;
    return `FT-${num}`;
  });
  const [error, setError] = useState('');
  const [pdfMerged, setPdfMerged] = useState(false);

  const formatQuantity = (value) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return value;

    if (Number.isInteger(parsed)) {
      return parsed.toLocaleString();
    }

    return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Menú 1: Calcular la propuesta
  const handleCalculateProposal = () => {
    setError('');

    if (!smartResults) {
      setError('Completa la calculadora solar para armar la propuesta automatica.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Auto-seleccionar productos basado en recomendaciones IA
    const newSelection = {};
    newSelection[smartResults.panelId] = smartResults.numPaneles;
    smartResults.piezas.forEach(pieza => {
      const exists = products.find(p => p.id === pieza.id);
      if (exists) {
        newSelection[pieza.id] = pieza.cant;
      }
    });

    setSelectedProducts(newSelection);
    setCurrentMenu('recommendations');
  };

  // Menú 2: Actualizar cantidad de productos
  const handleUpdateQuantity = (productId, quantity) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: quantity
    }));
  };

  // Menú 2: Toggle de producto
  const toggleProduct = (productId) => {
    setSelectedProducts((prev) => {
      const next = { ...prev };
      if (next[productId] !== undefined) {
        delete next[productId];
      } else {
        next[productId] = 1;
      }
      return next;
    });
  };

  // Navegar a merge
  const handleGoToMerge = () => {
    setCurrentMenu('merge');
  };

  // Volver a calculadora desde recomendaciones
  const handleBackToCalculator = () => {
    setCurrentMenu('calculator');
  };

  // Volver a recomendaciones desde merge
  const handleBackToRecommendations = () => {
    setCurrentMenu('recommendations');
    setPdfMerged(false);
  };

  // Volver al inicio (después de generar merge)
  const handleBackToStart = () => {
    setCurrentMenu('calculator');
    setSmartResults(null);
    setSelectedProducts({});
    setQuotePdf(null);
    setPdfMerged(false);
  };

  // ============ MENÚ 1: CALCULADORA ============
  if (currentMenu === 'calculator') {
    return (
      <>
        <Navbar />
        <div className="proposal-page">
          <div className="proposal-page__grid">
            <div className="proposal-page__col">
              <SmartCalculator products={products} onResultsChange={setSmartResults} />
              <Button
                variant="primary"
                icon="📐"
                onClick={handleCalculateProposal}
                fullWidth
              >
                Calcular Propuesta
              </Button>

              {error && (
                <div className="proposal-error proposal-error--compact animate-fade-in">
                  <span>⚠️</span> {error}
                </div>
              )}
            </div>

            <div className="proposal-page__col">
              <ProductSelector 
                products={products}
                categories={categories}
                selected={{}} 
                onToggle={() => {}} 
                onUpdateQuantity={() => {}} 
                loading={catalogLoading}
                error={catalogError}
                readOnly={true}
              />
            </div>
          </div>

        </div>
      </>
    );
  }

  // ============ MENÚ 2: RECOMENDACIONES ============
  if (currentMenu === 'recommendations') {
    return (
      <>
        <Navbar />
        <div className="proposal-page">
          <div className="proposal-page__recommendations">
          {/* Recomendación IA */}
          {smartResults && (
            <div className="proposal-card animate-fade-in-up">
              <h3 className="proposal-card__title">
                <span className="proposal-card__icon">🤖</span>
                Recomendación IA
              </h3>

              <div className="recommendations-content">
                <div className="recommendation-item">
                  <span className="recommendation-label">Perfil Recomendado:</span>
                  <span className="recommendation-value">{smartResults.recommendationLabel}</span>
                </div>
                <div className="recommendation-item">
                  <span className="recommendation-label">Panel Seleccionado:</span>
                  <span className="recommendation-value">{smartResults.panelName}</span>
                </div>
                <div className="recommendation-item">
                  <span className="recommendation-label">Cantidad de Paneles:</span>
                  <span className="recommendation-value">{smartResults.numPaneles}</span>
                </div>
                <div className="recommendation-item">
                  <span className="recommendation-label">Potencia Total:</span>
                  <span className="recommendation-value">{smartResults.totalWp} Wp</span>
                </div>
              </div>

              <div className="recommendation-materials">
                <h4>🧱 Materiales Calculados</h4>
                {smartResults.piezas?.length > 0 ? (
                  <ul className="recommendation-materials__list">
                    {smartResults.piezas.map((pieza) => (
                      <li key={pieza.id} className="recommendation-materials__item">
                        <span className="recommendation-materials__name">{pieza.name}</span>
                        <span className="recommendation-materials__qty">x {formatQuantity(pieza.cant)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="recommendation-materials__empty">No se generaron materiales para esta configuración.</p>
                )}
              </div>

              {/* Descripción previa */}
              <div className="recommendation-description">
                <h4>📝 Descripción</h4>
                <p>
                  Se ha recomendado un sistema de <strong>{smartResults.numPaneles}</strong> paneles de <strong>{smartResults.panelPower}W</strong> 
                  ({smartResults.totalWp}Wp total) con configuración <strong>{smartResults.recommendationLabel}</strong>. 
                  También se incluyó una lista de <strong>{smartResults.piezas?.length || 0} material(es)</strong> de estructura/cableado en base al cálculo previo. 
                  Este sistema proporciona una cobertura del <strong>{smartResults.coberturaObjetivo}%</strong> del consumo mensual estimado 
                  de <strong>{Math.round(smartResults.consumoMensual).toLocaleString()} kWh</strong> (equivalente a <strong>{Math.round(smartResults.consumoAnual).toLocaleString()} kWh/año</strong>), 
                  con una producción anual estimada de <strong>{Math.round(smartResults.estimatedAnnualProduction).toLocaleString()} kWh</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Lista editable de artículos */}
          <div className="proposal-card animate-fade-in-up">
            <h3 className="proposal-card__title">
              <span className="proposal-card__icon">📋</span>
              Artículos Recomendados
            </h3>

            <div className="editable-products-list">
              {Object.entries(selectedProducts).map(([productId, quantity]) => {
                const product = products.find(p => p.id === productId);
                if (!product) return null;

                return (
                  <div key={productId} className="editable-product-item">
                    <div className="product-info">
                      <span className="product-name">{product.name}</span>
                      <span className="product-price">${product.price.toFixed(2)}</span>
                    </div>
                    <div className="product-quantity">
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => handleUpdateQuantity(productId, parseInt(e.target.value) || 1)}
                        className="quantity-input"
                      />
                      <Button
                        variant="ghost"
                        icon="🗑️"
                        onClick={() => toggleProduct(productId)}
                        size="sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(selectedProducts).length === 0 && (
              <p className="empty-list">No hay artículos seleccionados</p>
            )}
          </div>
        </div>

        <div className="proposal-page__actions">
          <Button
            variant="secondary"
            icon="◀️"
            onClick={handleBackToCalculator}
            fullWidth
          >
            Volver
          </Button>

          <Button
            variant="primary"
            icon="📄"
            onClick={handleGoToMerge}
            fullWidth
          >
            ¿Deseas hacer el merge con la ficha técnica?
          </Button>
        </div>
      </div>
      </>
    );
  }

  // ============ MENÚ 3: MERGE PDF ============
  if (currentMenu === 'merge') {
    return (
      <>
        <Navbar />
        <div className="proposal-page">
          <div className="proposal-page__merge">
            <QuotePdfUploader value={quotePdf} onChange={setQuotePdf} />
          </div>

        <div className="proposal-page__actions">
          <Button
            variant="secondary"
            icon="◀️"
            onClick={handleBackToRecommendations}
            fullWidth
            disabled={pdfMerged}
          >
            Volver al menú anterior
          </Button>

          {!pdfMerged && (
            <PDFGenerator
              quotePdf={quotePdf}
              quoteNumber={quotePdf?.quoteApiData?.quoteId || quoteNumber}
              extraDatasheetReferences={quotePdf?.apiDatasheetReferences || []}
              disabled={!quotePdf}
              onMergeComplete={() => setPdfMerged(true)}
            />
          )}

          {pdfMerged && (
            <Button
              variant="success"
              icon="🏠"
              onClick={handleBackToStart}
              fullWidth
            >
              Volver al inicio
            </Button>
          )}
        </div>
      </div>
      </>
    );
  }
}
