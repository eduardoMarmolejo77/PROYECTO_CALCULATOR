import { useId, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import Button from '../../components/common/Button';
import { fetchQuoteById } from '../../config/products';
import {
  checkAvailableDatasheets,
  extractDatasheetNamesFromQuotePdf,
  extractDatasheetReferencesFromQuoteLines,
} from '../../services/pdfDatasheetService';
import './proposal.css';

function uniqueCaseInsensitive(values) {
  const byLower = new Map();

  values.forEach((value) => {
    const text = String(value || '').trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (!byLower.has(key)) byLower.set(key, text);
  });

  return [...byLower.values()];
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function fetchFirstMatchingQuote(quoteIds) {
  const candidates = uniqueCaseInsensitive(quoteIds).slice(0, 8);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const quote = await fetchQuoteById(candidate);
      return { quote, matchedId: candidate, error: null };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    quote: null,
    matchedId: null,
    error: lastError,
  };
}

/**
 * Carga y valida el PDF de cotizacion que luego se fusionara con fichas tecnicas.
 * Extrae automaticamente codigos/nombres de fichas detectados dentro del PDF.
 */
export default function QuotePdfUploader({ value, onChange, onDatasheetNamesExtracted }) {
  const inputId = useId();
  const [error, setError] = useState('');
  const [isReading, setIsReading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    setError('');

    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Carga un archivo PDF válido.');
      onChange(null);
      if (onDatasheetNamesExtracted) onDatasheetNamesExtracted([]);
      event.target.value = '';
      return;
    }

    setIsReading(true);
    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      // Extraer codigos/nombres y numero de cotizacion desde el PDF.
      const extractResult = await extractDatasheetNamesFromQuotePdf(file);
      const pdfDetectedReferences = extractResult.success ? extractResult.datasheetNames : [];
      const detectedQuoteIds = extractResult.quoteIds || [];
      let apiDatasheetReferences = [];
      let quoteApiData = null;
      let apiLookupError = '';
      let foundDatasheetNames = [];
      let missingDatasheetNames = [];

      if (detectedQuoteIds.length > 0) {
        const apiLookup = await fetchFirstMatchingQuote(detectedQuoteIds);

        if (apiLookup.quote) {
          const apiReferences = extractDatasheetReferencesFromQuoteLines(apiLookup.quote.lines);
          apiDatasheetReferences = apiReferences.datasheetNames || [];
          quoteApiData = {
            quoteId: apiLookup.quote.id || apiLookup.matchedId,
            matchedId: apiLookup.matchedId,
            customerName: apiLookup.quote.customerName || '',
            linesCount: apiLookup.quote.lines?.length || 0,
            datasheetReferences: apiDatasheetReferences,
          };
        } else {
          apiLookupError = `Se detectó la cotización ${detectedQuoteIds.join(', ')}, pero no se pudo leer en InterFuerza.`;
        }
      } else {
        apiLookupError = 'No se reconoció el número de cotización dentro del PDF.';
      }

      const detectedReferences = uniqueCaseInsensitive([
        ...pdfDetectedReferences,
        ...apiDatasheetReferences,
      ]);

      if (detectedReferences.length === 0) {
        setError(apiLookupError || 'No se detectaron codigos de producto o nombres de fichas en esta cotizacion.');
      } else {
        const availability = await checkAvailableDatasheets(detectedReferences);
        foundDatasheetNames = availability.foundSlugs || [];
        missingDatasheetNames = availability.missing || [];

        if (foundDatasheetNames.length === 0) {
          setError('Se detectaron codigos, pero no se encontro ninguna ficha en Supabase.');
        } else if (missingDatasheetNames.length > 0) {
          setError(`Se encontraron ${foundDatasheetNames.length} ficha(s), pero ${missingDatasheetNames.length} no existen en Supabase.`);
        } else if (apiLookupError) {
          setError(apiLookupError);
        }
      }

      onChange({
        file,
        name: file.name,
        size: file.size,
        pages: pdf.getPageCount(),
        loadedAt: new Date().toISOString(),
        datasheetNames: foundDatasheetNames,
        foundDatasheetNames,
        missingDatasheetNames,
        pdfDetectedDatasheetReferences: pdfDetectedReferences,
        apiDatasheetReferences,
        detectedDatasheetReferences: detectedReferences,
        detectedQuoteIds,
        quoteApiData,
        apiLookupError,
      });

      if (onDatasheetNamesExtracted) {
        onDatasheetNamesExtracted(foundDatasheetNames);
      }

      if (detectedReferences.length > 0) {
        console.log('Referencias detectadas en cotizacion:', detectedReferences);
      }

      if (quoteApiData) {
        console.log('Cotizacion leida por API:', quoteApiData);
      }

      if (foundDatasheetNames.length > 0) {
        console.log('Fichas encontradas en Supabase:', foundDatasheetNames);
      }

      if (missingDatasheetNames.length > 0) {
        console.warn('Referencias no encontradas en Supabase:', missingDatasheetNames);
      }
    } catch (err) {
      console.error('Error reading quote PDF:', err);
      setError('No se pudo leer el PDF. Verifica que no esté dañado o protegido.');
      onChange(null);
      if (onDatasheetNamesExtracted) onDatasheetNamesExtracted([]);
      event.target.value = '';
    } finally {
      setIsReading(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    if (onDatasheetNamesExtracted) onDatasheetNamesExtracted([]);
    setError('');
  };

  const foundDatasheetNames = value?.foundDatasheetNames || value?.datasheetNames || [];
  const missingDatasheetNames = value?.missingDatasheetNames || [];
  const foundCount = foundDatasheetNames.length;
  const missingCount = missingDatasheetNames.length;
  const quoteApiData = value?.quoteApiData;

  return (
    <div className="proposal-card quote-upload animate-fade-in-up">
      <h3 className="proposal-card__title">
        <span className="proposal-card__icon">📎</span>
        Cotización PDF
      </h3>

      <div className={`quote-upload__dropzone ${value ? 'quote-upload__dropzone--ready' : ''}`}>
        <input
          id={inputId}
          className="quote-upload__input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
        />
        <label htmlFor={inputId} className="quote-upload__label">
          <span className="quote-upload__icon">{isReading ? '⏳' : value ? '✅' : '📄'}</span>
          <span className="quote-upload__main">
            {isReading ? 'Leyendo cotización...' : value ? 'PDF leído correctamente' : 'Cargar cotización en PDF'}
          </span>
          <span className="quote-upload__hint">
            {value ? `${value.pages} página${value.pages === 1 ? '' : 's'} · ${formatFileSize(value.size)}` : 'Se extraeran codigos/fichas automaticamente'}
          </span>
        </label>
      </div>

      {value && (
        <div className="quote-upload__file">
          <div>
            <span className="quote-upload__filename">{value.name}</span>
            {quoteApiData && (
              <span className="quote-upload__meta">
                Cotización API: {quoteApiData.quoteId} · {quoteApiData.linesCount} línea{quoteApiData.linesCount === 1 ? '' : 's'}
              </span>
            )}
            <span className="quote-upload__meta">
              {foundCount > 0
                ? `${foundCount} ficha${foundCount === 1 ? '' : 's'} encontrada${foundCount === 1 ? '' : 's'}${missingCount > 0 ? ` · ${missingCount} pendiente${missingCount === 1 ? '' : 's'}` : ''}`
                : 'No se encontraron fichas en Supabase'}
            </span>
          </div>
          <Button type="button" variant="ghost" icon="🗑️" onClick={handleClear}>
            Quitar
          </Button>
        </div>
      )}

      {value && (foundCount > 0 || missingCount > 0) && (
        <div className="quote-upload__datasheets">
          <div className="datasheets-list">
            {foundCount > 0 && (
              <>
                <p className="datasheets-list__title">✅ Fichas encontradas en Supabase:</p>
                <ul className="datasheets-list__items">
                  {foundDatasheetNames.map((name) => (
                    <li key={name} className="datasheets-list__item">
                      <span className="datasheets-list__icon">📄</span>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {missingCount > 0 && (
              <>
                <p className="datasheets-list__title datasheets-list__title--missing">⚠️ Referencias no encontradas:</p>
                <ul className="datasheets-list__items">
                  {missingDatasheetNames.map((name) => (
                    <li key={name} className="datasheets-list__item datasheets-list__item--missing">
                      <span className="datasheets-list__icon">❌</span>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="proposal-error proposal-error--compact">
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
}
