import { useCallback } from 'react';
import Button from '../../components/common/Button';
import { generatePDFTemplate } from './PDFTemplate';

/**
 * Componente para generar y descargar el PDF de la propuesta.
 */
export default function PDFGenerator({ clientData, quoteNumber, technicalResults, selectedProducts, products, economic, disabled, className, id }) {
  const handleGenerate = useCallback(async () => {
    const hasProducts = selectedProducts instanceof Set 
      ? selectedProducts.size > 0 
      : Object.keys(selectedProducts || {}).length > 0;

    if (!economic || !hasProducts) {
      alert('Debes calcular la propuesta y seleccionar productos primero.');
      return;
    }

    // Guardar en el historial (localStorage)
    try {
      const HISTORY_KEY = 'propuestas_app_history';
      const existingHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      
      const newEntry = {
        id: Date.now(),
        quoteNumber: quoteNumber,
        cliente: clientData.cliente,
        ruc: clientData.ruc,
        total: economic.total,
        productCount: Object.keys(selectedProducts || {}).length,
        date: new Date().toISOString(),
        // Guardamos una copia de los datos para posible reutilización
        clientData,
        technicalResults,
        selectedProducts,
        economic
      };

      localStorage.setItem(HISTORY_KEY, JSON.stringify([newEntry, ...existingHistory]));
    } catch (err) {
      console.error('Error saving to history:', err);
    }

    // Import html2pdf dynamically
    const html2pdf = (await import('html2pdf.js')).default;

    const htmlString = generatePDFTemplate({
      clientData,
      quoteNumber,
      technicalResults,
      selectedProducts,
      products,
      economic,
    });

    const opt = {
      margin: 10,
      filename: `${quoteNumber}_${clientData.cliente.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      pagebreak: { mode: 'css', avoid: ['tr', '.avoid-break'] }
    };

    try {
      await html2pdf().set(opt).from(htmlString).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF. Revisa la consola para más detalles.');
    }
  }, [clientData, quoteNumber, technicalResults, selectedProducts, products, economic]);

  return (
    <Button
      id={id}
      className={className}
      variant="success"
      icon="📄"
      disabled={disabled}
      onClick={handleGenerate}
      fullWidth
    >
      Descargar PDF
    </Button>
  );
}
