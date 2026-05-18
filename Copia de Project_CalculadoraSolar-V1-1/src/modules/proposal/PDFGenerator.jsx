import { useCallback, useState } from 'react';
import Button from '../../components/common/Button';
import { generateMergedPdfWithDatasheets } from '../../services/pdfDatasheetService';

function sanitizeFilename(name) {
  return (name || 'cotizacion')
    .replace(/\.pdf$/i, '')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'cotizacion';
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Fusiona la cotizacion con las fichas tecnicas detectadas en el PDF
 * y descargadas desde Supabase.
 */
export default function PDFGenerator({
  quotePdf,
  quoteNumber,
  extraDatasheetReferences = [],
  disabled,
  className,
  id,
  onMergeComplete
}) {
  const [isMerging, setIsMerging] = useState(false);

  const handleGenerateMergedPdf = useCallback(async () => {
    if (!quotePdf?.file) {
      alert('Carga primero el PDF de cotizacion.');
      return;
    }

    setIsMerging(true);

    try {
      const result = await generateMergedPdfWithDatasheets(quotePdf.file, {
        extraDatasheetReferences,
      });

      if (!result.success) {
        alert(`No se pudo generar el merge: ${result.error}`);
        return;
      }

      const filename = `${sanitizeFilename(quotePdf.name)}_merge_con_fichas.pdf`;
      downloadBytes(result.mergedPdf, filename);

      if (result.missing?.length > 0) {
        alert(`Merge completado. Se adjuntaron ${result.downloaded?.length || 0} ficha(s) y ${result.missing.length} referencia(s) no se encontraron en Supabase.`);
      } else {
        alert(`Merge completado correctamente. Se adjuntaron ${result.downloaded?.length || 0} ficha(s).`);
      }

      // Notificar que el merge se completó
      if (onMergeComplete) {
        onMergeComplete();
      }

      try {
        const HISTORY_KEY = 'propuestas_app_history';
        const existingHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const newEntry = {
          id: Date.now(),
          quoteNumber,
          quoteFileName: quotePdf.name,
          quotePages: quotePdf.pages,
          date: new Date().toISOString(),
          mode: 'datasheets',
          datasheetCount: result.downloaded?.length || 0,
          downloadedDatasheets: result.downloaded || [],
          missingDatasheets: result.missing || [],
          apiDatasheetReferences: extraDatasheetReferences,
        };

        localStorage.setItem(HISTORY_KEY, JSON.stringify([newEntry, ...existingHistory]));
      } catch (historyError) {
        console.error('Error guardando historial:', historyError);
      }
    } catch (error) {
      console.error('Error fusionando cotizacion y fichas tecnicas:', error);
      alert('Hubo un error al hacer el merge. Verifica la configuracion de Supabase y la cotizacion.');
    } finally {
      setIsMerging(false);
    }
  }, [extraDatasheetReferences, onMergeComplete, quotePdf, quoteNumber]);

  return (
    <Button
      id={id}
      className={className}
      variant="success"
      icon="🧩"
      disabled={disabled || isMerging}
      onClick={handleGenerateMergedPdf}
      fullWidth
    >
      {isMerging ? 'Fusionando...' : 'Hacer merge de PDF'}
    </Button>
  );
}
