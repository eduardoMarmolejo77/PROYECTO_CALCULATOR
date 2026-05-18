import { useState, useEffect } from 'react';
import { CATEGORIES, fetchCatalog } from '../../config/products';
import ProposalWorkflow from './ProposalWorkflow';
import './proposal.css';

/**
 * Página principal del módulo de propuestas.
 * Carga el catálogo y orquesta el flujo de 3 menús con ProposalWorkflow.
 */
export default function ProposalPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

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

  return (
    <ProposalWorkflow 
      products={products}
      categories={categories}
      catalogLoading={catalogLoading}
      catalogError={catalogError}
    />
  );
}
