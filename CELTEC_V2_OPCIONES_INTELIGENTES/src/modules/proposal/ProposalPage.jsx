import { useState, useMemo, useEffect } from 'react';
import { useCalculations } from '../../hooks/useCalculations';
import { CATEGORIES, fetchCatalog } from '../../config/products';
import Button from '../../components/common/Button';
import ClientForm from './ClientForm';
import SmartCalculator from './SmartCalculator';
import ProductSelector from './ProductSelector';
import PriceSummary from './PriceSummary';
import PDFGenerator from './PDFGenerator';
import './proposal.css';

const INITIAL_CLIENT = {
  cliente: '',
  ruc: '',
  direccion: '',
  contacto: '',
  email: '',
  proyecto: '',
  potencia: '',
  voltaje: '',
  ambiente: '',
  garantia: '12',
  plazo: '',
};

/**
 * Página principal del módulo de propuestas.
 * Orquesta todos los subcomponentes.
 */
export default function ProposalPage() {
  const [clientData, setClientData] = useState(INITIAL_CLIENT);
  const [quoteNumber] = useState(() => {
    const num = Math.floor(Math.random() * 90000) + 10000;
    return `COT-${num}`;
  });
  const [technicalResults, setTechnicalResults] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState({}); // { id: quantity }
  const [discountRate, setDiscountRate] = useState(0);
  const [error, setError] = useState('');
  const [smartResults, setSmartResults] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const { calcularEconomico } = useCalculations();

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError('');

      try {
        const catalog = await fetchCatalog();
        if (!isMounted) return;
        setProducts(catalog.products);
        setCategories(catalog.categories);
      } catch (err) {
        if (!isMounted) return;
        setCatalogError(err.message || 'No se pudo cargar el catálogo desde InterFuerza');
        setProducts([]);
        setCategories(CATEGORIES);
      } finally {
        if (isMounted) setCatalogLoading(false);
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  // Calcular subtotal de productos seleccionados
  const subtotal = useMemo(() => {
    let total = 0;
    for (const p of products) {
      const qty = selectedProducts[p.id];
      if (qty) total += p.price * qty;
    }
    return total;
  }, [products, selectedProducts]);

  // Calcular resumen económico
  const economic = useMemo(() => {
    if (subtotal === 0) return null;
    return calcularEconomico(subtotal, (discountRate || 0) / 100);
  }, [subtotal, discountRate, calcularEconomico]);

  // Manejar cambio en selección/cantidad
  const handleUpdateQuantity = (productId, quantity) => {
    setSelectedProducts((prev) => {
      return {
        ...prev,
        [productId]: quantity
      };
    });
  };

  // Toggle producto (para eliminar o agregar con 1)
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

  // Calcular propuesta automatizada
  const handleCalculate = () => {
    setError('');
    const { cliente, proyecto } = clientData;
    if (!cliente || !proyecto) {
      setError('Por favor completa al menos el nombre del cliente y el proyecto');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!smartResults) return;

    // --- AUTO-SELECCIÓN DE PRODUCTOS ---
    const newSelection = {};
    
    // 1. Agregar el panel seleccionado
    newSelection[smartResults.panelId] = smartResults.numPaneles;

    // 2. Agregar piezas estructurales
    // Buscamos en el catálogo si el ID de la pieza existe
    smartResults.piezas.forEach(pieza => {
      const exists = products.find(p => p.id === pieza.id);
      if (exists) {
        newSelection[pieza.id] = pieza.cant;
      }
    });

    setSelectedProducts(newSelection);
    setTechnicalResults({
      paneles: smartResults.numPaneles,
      totalWp: smartResults.totalWp,
      estructura: smartResults.tipoMontaje
    });
  };

  // Limpiar solo sección de productos y cálculos
  const handleReset = () => {
    setSelectedProducts({});
    setTechnicalResults(null);
    setDiscountRate(0);
    setError('');
  };

  return (
    <div className="proposal-page">
      <div className="proposal-page__header">
        <h1 className="proposal-page__title">
          <span>🚀</span> Nueva Propuesta Comercial
        </h1>
        <p className="proposal-page__subtitle">
          Dimensionamiento automático y generación de propuestas técnico-económicas
        </p>
      </div>

      <div className="proposal-page__grid">
        {/* Columna izquierda */}
        <div className="proposal-page__col">
          <ClientForm data={clientData} onChange={setClientData} />
          <SmartCalculator products={products} onResultsChange={setSmartResults} />
        </div>

        {/* Columna derecha */}
        <div className="proposal-page__col">
          {/* La calculadora inteligente reemplaza al dimensionamiento automático */}
          <ProductSelector 
            products={products}
            categories={categories}
            selected={selectedProducts} 
            onToggle={toggleProduct} 
            onUpdateQuantity={handleUpdateQuantity} 
            loading={catalogLoading}
            error={catalogError}
          />
          <PriceSummary economic={economic} discountRate={discountRate} onDiscountChange={setDiscountRate} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="proposal-error animate-fade-in">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Botones de acción */}
      <div className="proposal-page__actions">
        <Button
          variant="primary"
          icon="📐"
          onClick={handleCalculate}
          fullWidth
        >
          Calcular Propuesta
        </Button>

        <PDFGenerator
          clientData={clientData}
          quoteNumber={quoteNumber}
          technicalResults={technicalResults || {}}
          selectedProducts={selectedProducts}
          products={products}
          economic={economic}
          disabled={Object.keys(selectedProducts).length === 0}
        />

        <Button
          variant="ghost"
          icon="🧹"
          onClick={handleReset}
        >
          Limpiar Selección
        </Button>
      </div>
    </div>
  );
}
