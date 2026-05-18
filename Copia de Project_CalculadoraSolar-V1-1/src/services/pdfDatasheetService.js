// Servicio para detectar fichas tecnicas en cotizaciones PDF,
// validarlas contra Supabase y fusionarlas en un unico archivo.

import { PDFDocument } from 'pdf-lib';
import { downloadMultipleDatasheets, datasheetExists } from './supabaseService';

const COMMON_PDF_TOKENS = new Set([
  'obj',
  'endobj',
  'stream',
  'endstream',
  'catalog',
  'pages',
  'page',
  'font',
  'length',
  'mediabox',
  'resources',
  'contents',
  'parent',
  'kids',
  'xref',
  'trailer',
  'producer',
  'creator',
  'type',
  'root',
  'null',
]);

const MAX_OCR_PAGES = 4;
let pdfJsLoaderPromise = null;

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

async function loadPdfJs() {
  if (!pdfJsLoaderPromise) {
    pdfJsLoaderPromise = Promise.all([
      import('pdfjs-dist/build/pdf.mjs'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfModule, workerModule]) => {
      pdfModule.GlobalWorkerOptions.workerSrc = workerModule.default;
      return { getDocument: pdfModule.getDocument };
    });
  }

  return pdfJsLoaderPromise;
}

function normalizeReferenceToken(value) {
  return String(value || '')
    .replace(/\.pdf$/i, '')
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*_\s*/g, '_')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .replace(/[|,:;]+$/g, '')
    .trim();
}

function toSlug(value) {
  return String(value || '')
    .replace(/[–—]/g, '-')
    .replace(/\s*\/\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .trim();
}

/**
 * Extrae texto con PDF.js para cotizaciones complejas.
 * @param {ArrayBuffer} pdfBytes
 * @returns {Promise<string>}
 */
async function extractTextWithPdfJs(pdfBytes, options = {}) {
  const { getDocument } = await loadPdfJs();
  const { maxPages = Number.POSITIVE_INFINITY } = options;
  const loadingTask = getDocument({
    data: new Uint8Array(pdfBytes),
    // Mejor compatibilidad en navegador para PDFs con fuentes embebidas.
    useWorkerFetch: true,
  });

  const pdf = await loadingTask.promise;
  const chunks = [];
  const totalPages = Math.min(pdf.numPages, maxPages);

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    chunks.push(pageText);
  }

  return chunks.join('\n').trim();
}

/**
 * OCR de respaldo para PDFs escaneados o rasterizados.
 * @param {ArrayBuffer} pdfBytes
 * @returns {Promise<string>}
 */
async function extractTextWithOcrFromPdf(pdfBytes) {
  if (typeof document === 'undefined') {
    return '';
  }

  const [{ getDocument }, { createWorker }] = await Promise.all([
    loadPdfJs(),
    import('tesseract.js'),
  ]);

  const loadingTask = getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = Math.min(pdf.numPages, MAX_OCR_PAGES);
  const worker = await createWorker('eng');
  const ocrChunks = [];

  try {
    await worker.setParameters({
      // Ayuda a reducir ruido y priorizar formatos de codigos.
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_()/.:| ',
    });

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        continue;
      }

      await page.render({ canvasContext: context, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      ocrChunks.push(data?.text || '');

      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }

  return ocrChunks.join('\n').trim();
}

/**
 * Fallback: extrae texto simple desde bloques BT/ET del PDF.
 * Si no encuentra bloques legibles, retorna el texto crudo.
 * @param {ArrayBuffer} pdfBytes
 * @returns {string}
 */
function extractTextFromRawPdf(pdfBytes) {
  try {
    const rawText = new TextDecoder('latin1').decode(pdfBytes);
    const textBlocks = rawText.match(/BT[\s\S]*?ET/g) || [rawText];
    let extractedText = '';

    textBlocks.forEach((block) => {
      const literalMatches = block.match(/\(([^)]{2,})\)/g) || [];
      literalMatches.forEach((match) => {
        extractedText += ` ${match.slice(1, -1)}`;
      });
    });

    return extractedText.trim() || rawText;
  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error);
    return '';
  }
}

/**
 * Extrae texto del PDF usando PDF.js y fallback por lectura cruda.
 * @param {ArrayBuffer} pdfBytes
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(pdfBytes) {
  try {
    const pdfJsText = await extractTextWithPdfJs(pdfBytes);
    if (pdfJsText) return pdfJsText;
  } catch (error) {
    console.warn('PDF.js no pudo extraer texto, usando fallback crudo:', error);
  }

  return extractTextFromRawPdf(pdfBytes);
}

/**
 * Busca referencias explicitas a archivos PDF.
 * Ej: LR5-54HTB-435M.pdf
 * @param {string} text
 * @returns {string[]}
 */
function extractPdfNamesFromText(text) {
  if (!text) return [];

  const matches = text.match(/\b([A-Za-z0-9][A-Za-z0-9._-]{2,100}\.pdf)\b/gi) || [];
  return uniqueCaseInsensitive(matches.map((name) => normalizeReferenceToken(name)));
}

/**
 * Prioriza extraccion desde "Codigo: ...".
 * Ej:
 * - Codigo: LR7-72HVH-650M | Marca: Longi
 * - Código: S5-GR1P9K (METER-TYPE) | Marca: Solis
 * @param {string} text
 * @returns {string[]}
 */
function extractCodesByLabel(text) {
  if (!text) return [];

  const codes = [];
  const pattern = /c[oó]digo\s*:\s*([^|]+?)(?=\s*(?:\||marca\s*:|c[oó]digo\s*:|$))/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const normalized = normalizeReferenceToken(match[1]);
    if (normalized) codes.push(normalized);
  }

  return uniqueCaseInsensitive(codes);
}

function isLikelyProductCode(token) {
  const normalized = normalizeReferenceToken(token);
  const lower = normalized.toLowerCase();

  if (!normalized || normalized.length < 5 || normalized.length > 100) return false;
  if (!/[a-z]/i.test(normalized) || !/\d/.test(normalized)) return false;
  if (!/[-_()/]/.test(normalized)) return false;
  if (COMMON_PDF_TOKENS.has(lower)) return false;
  if (lower.startsWith('http')) return false;

  return true;
}

function isLikelyCompactCode(token) {
  const normalized = normalizeReferenceToken(token);
  const lower = normalized.toLowerCase();

  if (!normalized || normalized.length < 4 || normalized.length > 80) return false;
  if (!/[a-z]/i.test(normalized) || !/\d/.test(normalized)) return false;
  if (COMMON_PDF_TOKENS.has(lower)) return false;
  if (lower.startsWith('http')) return false;

  return true;
}

/**
 * Fallback: extrae codigos por patron generico.
 * @param {string} text
 * @returns {string[]}
 */
function extractFallbackCodes(text) {
  if (!text) return [];

  const matches = text.match(/\b([A-Za-z0-9]+(?:[-_][A-Za-z0-9()]+)+)\b/g) || [];
  return uniqueCaseInsensitive(
    matches
      .map((value) => normalizeReferenceToken(value))
      .filter(isLikelyProductCode)
  );
}

function extractReferencesFromText(text) {
  const pdfNames = extractPdfNamesFromText(text);
  const productCodes = extractCodesByLabel(text);
  const fallbackCodes = extractFallbackCodes(text);
  const datasheetNames = buildDatasheetReferences(pdfNames, productCodes, fallbackCodes);

  return { pdfNames, productCodes, fallbackCodes, datasheetNames };
}

function normalizeQuoteId(value) {
  return String(value || '')
    .replace(/\.pdf$/i, '')
    .replace(/\s+/g, '')
    .replace(/^[-#:]+|[-#:]+$/g, '')
    .trim();
}

function buildQuoteIdCandidates(values = []) {
  const candidates = [];

  values.forEach((value) => {
    const normalized = normalizeQuoteId(value);
    if (!normalized) return;

    candidates.push(normalized);

    const numericPart = normalized.match(/\d{2,12}/)?.[0];
    if (numericPart) {
      candidates.push(numericPart);
      candidates.push(numericPart.replace(/^0+(?=\d)/, ''));
    }
  });

  return uniqueCaseInsensitive(candidates.filter(Boolean));
}

function extractQuoteIdsFromText(text) {
  if (!text) return [];

  const normalizedText = String(text).replace(/\s+/g, ' ');
  const matches = [];
  const patterns = [
    /(?:cotizaci[oó]n|cotizacion|quote|proforma)\s*(?:n(?:o|ro)?\.?|n[°º]\.?|#|num(?:ero)?\.?|n[uú]mero)?\s*[:#-]?\s*([A-Za-z]{0,8}[-\s]?\d{2,12})/gi,
    /(?:n(?:o|ro)?\.?|n[°º]\.?|#|num(?:ero)?\.?|n[uú]mero)\s*(?:de\s*)?(?:cotizaci[oó]n|cotizacion|quote|proforma)\s*[:#-]?\s*([A-Za-z]{0,8}[-\s]?\d{2,12})/gi,
    /(?:documento|doc)\s*(?:n(?:o|ro)?\.?|n[°º]\.?|#|num(?:ero)?\.?|n[uú]mero)?\s*[:#-]?\s*([A-Za-z]{0,8}[-\s]?\d{2,12})/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(normalizedText)) !== null) {
      matches.push(match[1]);
    }
  });

  return buildQuoteIdCandidates(matches);
}

function extractQuoteIdsFromFilename(filename) {
  if (!filename) return [];

  const cleanName = String(filename).replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
  const labeledMatches = [];
  const labeledPattern = /(?:cotizaci[oó]n|cotizacion|quote|proforma|ft)\s*[:#-]?\s*([A-Za-z]{0,8}[-\s]?\d{2,12})/gi;

  let match;
  while ((match = labeledPattern.exec(cleanName)) !== null) {
    labeledMatches.push(match[1]);
  }

  if (labeledMatches.length > 0) return buildQuoteIdCandidates(labeledMatches);

  return buildQuoteIdCandidates(cleanName.match(/\b[A-Za-z]{0,8}[-\s]?\d{3,12}\b/g) || []);
}

/**
 * Extrae referencias de fichas desde lineas de una cotizacion via API.
 * @param {Object[]} quoteLines
 * @returns {{ datasheetNames: string[], productCodes: string[], pdfNames: string[], fallbackCodes: string[] }}
 */
export function extractDatasheetReferencesFromQuoteLines(quoteLines = []) {
  if (!Array.isArray(quoteLines) || quoteLines.length === 0) {
    return {
      datasheetNames: [],
      productCodes: [],
      pdfNames: [],
      fallbackCodes: [],
    };
  }

  const explicitCodes = [];
  const textChunks = [];

  quoteLines.forEach((line) => {
    if (!line || typeof line !== 'object') return;

    const codeCandidates = [
      line.Codigo,
      line.Código,
      line.Item_Number,
      line.ItemNumber,
      line.UPC_Code,
      line.UPC,
      line.id,
      line.ID,
    ];

    codeCandidates.forEach((candidate) => {
      const normalized = normalizeReferenceToken(candidate);
      if (!normalized) return;
      if (!isLikelyProductCode(normalized) && !isLikelyCompactCode(normalized)) return;
      explicitCodes.push(normalized);
    });

    const lineText = [
      line.Nombre,
      line.Name,
      line.Descripcion,
      line.Descripción,
      line.Description,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' | ');

    if (lineText) textChunks.push(lineText);
  });

  const textRefs = extractReferencesFromText(textChunks.join('\n'));
  const productCodes = uniqueCaseInsensitive([...explicitCodes, ...textRefs.productCodes]);
  const fallbackCodes = uniqueCaseInsensitive(textRefs.fallbackCodes);
  const datasheetNames = buildDatasheetReferences(textRefs.pdfNames, productCodes, fallbackCodes);

  return {
    datasheetNames,
    productCodes,
    pdfNames: textRefs.pdfNames,
    fallbackCodes,
  };
}

function buildDatasheetReferences(pdfNames, labeledCodes, fallbackCodes) {
  const prioritizedCodes = labeledCodes.length > 0 ? labeledCodes : fallbackCodes;
  const refs = [
    ...prioritizedCodes,
    ...pdfNames,
  ]
    .map((value) => normalizeReferenceToken(value))
    .filter(Boolean);

  return uniqueCaseInsensitive(refs);
}

function buildCandidateSlugs(reference) {
  const base = normalizeReferenceToken(reference);
  if (!base) return [];

  const variants = [
    base,
    base.replace(/\s*\(([^)]+)\)\s*/g, '-$1-'),
    base.replace(/\s*\([^)]*\)\s*/g, ' '),
    base.replace(/\s+/g, ''),
    base.replace(/\s+/g, '-'),
  ];

  const candidates = [];

  variants.forEach((variant) => {
    const cleaned = normalizeReferenceToken(variant);
    if (!cleaned) return;

    const slug = toSlug(cleaned);
    if (!slug) return;

    candidates.push(slug);
    candidates.push(slug.toUpperCase());
    candidates.push(slug.toLowerCase());
  });

  return uniqueCaseInsensitive(candidates);
}

/**
 * Extrae posibles fichas tecnicas de la cotizacion:
 * - Codigo: ...
 * - Nombres de archivos .pdf
 * - Fallback por patron de codigo
 * @param {File} pdfFile
 * @returns {Promise<Object>} { success, datasheetNames, productCodes, pdfNames, quoteIds, error }
 */
export async function extractDatasheetNamesFromQuotePdf(pdfFile) {
  if (!pdfFile) {
    return {
      success: false,
      error: 'Archivo PDF requerido',
      datasheetNames: [],
      productCodes: [],
      pdfNames: [],
      quoteIds: [],
    };
  }

  try {
    const bytes = await pdfFile.arrayBuffer();
    const textContent = await extractTextFromPdf(bytes);
    const textRefs = extractReferencesFromText(textContent);
    const filenameQuoteIds = extractQuoteIdsFromFilename(pdfFile.name);
    let pdfNames = textRefs.pdfNames;
    let productCodes = textRefs.productCodes;
    let fallbackCodes = textRefs.fallbackCodes;
    let datasheetNames = textRefs.datasheetNames;
    let quoteIds = uniqueCaseInsensitive([
      ...extractQuoteIdsFromText(textContent),
      ...filenameQuoteIds,
    ]);
    let ocrUsed = false;

    // Si no se encuentran codigos claros, intentar OCR del PDF escaneado.
    if (productCodes.length === 0 || quoteIds.length === 0) {
      try {
        const ocrText = await extractTextWithOcrFromPdf(bytes);
        if (ocrText) {
          ocrUsed = true;
          const ocrRefs = extractReferencesFromText(ocrText);

          pdfNames = uniqueCaseInsensitive([...pdfNames, ...ocrRefs.pdfNames]);
          fallbackCodes = uniqueCaseInsensitive([...fallbackCodes, ...ocrRefs.fallbackCodes]);
          productCodes = ocrRefs.productCodes.length > 0 ? ocrRefs.productCodes : productCodes;
          datasheetNames = buildDatasheetReferences(pdfNames, productCodes, fallbackCodes);
          quoteIds = uniqueCaseInsensitive([
            ...quoteIds,
            ...extractQuoteIdsFromText(ocrText),
          ]);
        }
      } catch (ocrError) {
        console.warn('No se pudo ejecutar OCR de respaldo para la cotizacion:', ocrError);
      }
    }

    if (datasheetNames.length === 0) {
      return {
        success: false,
        error: 'No se encontraron codigos de producto o nombres de ficha tecnica en el PDF.',
        datasheetNames: [],
        productCodes: [],
        pdfNames: [],
        quoteIds,
      };
    }

    console.log('Referencias detectadas en cotizacion:', { pdfNames, productCodes, datasheetNames, quoteIds, ocrUsed });

    return {
      success: true,
      datasheetNames,
      productCodes,
      pdfNames,
      quoteIds,
      error: null,
    };
  } catch (error) {
    console.error('Error extrayendo referencias de fichas tecnicas:', error);
    return {
      success: false,
      error: `Error al procesar PDF: ${error.message}`,
      datasheetNames: [],
      productCodes: [],
      pdfNames: [],
      quoteIds: [],
    };
  }
}

/**
 * Resuelve cada referencia detectada contra Supabase.
 * Para cada referencia prueba variantes hasta encontrar una.
 * @param {string[]} datasheetReferences
 * @returns {Promise<Object>} { found, missing, foundSlugs }
 */
export async function resolveDatasheetReferences(datasheetReferences = []) {
  const references = uniqueCaseInsensitive(datasheetReferences);
  const found = [];
  const missing = [];
  const known = new Map(); // lower -> canonical slug ya confirmado

  for (const reference of references) {
    const candidates = buildCandidateSlugs(reference);
    let matchedSlug = null;

    for (const candidate of candidates) {
      const lower = candidate.toLowerCase();
      if (known.has(lower)) {
        matchedSlug = known.get(lower);
        break;
      }

      // Si no existe este candidato, sigue con el siguiente.
      const exists = await datasheetExists(candidate);
      if (!exists) continue;

      matchedSlug = candidate;
      known.set(lower, candidate);
      break;
    }

    if (matchedSlug) {
      found.push({ reference, datasheetName: matchedSlug });
    } else {
      missing.push({ reference, tried: candidates });
    }
  }

  return {
    found,
    missing,
    foundSlugs: uniqueCaseInsensitive(found.map((item) => item.datasheetName)),
  };
}

/**
 * Verifica disponibilidad de fichas en storage.
 * @param {string[]} datasheetReferences
 * @returns {Promise<Object>} { available, missing, found, foundSlugs }
 */
export async function checkAvailableDatasheets(datasheetReferences) {
  const resolved = await resolveDatasheetReferences(datasheetReferences);
  const available = {};

  resolved.found.forEach(({ reference, datasheetName }) => {
    available[reference] = datasheetName;
  });

  return {
    available,
    missing: resolved.missing.map((item) => item.reference),
    found: resolved.found,
    foundSlugs: resolved.foundSlugs,
  };
}

/**
 * Descarga todas las fichas detectadas y resueltas.
 * @param {string[]} datasheetReferences
 * @returns {Promise<Object>} { pdfs, errors, downloaded, missing, found }
 */
export async function downloadAllDatasheets(datasheetReferences) {
  const resolved = await resolveDatasheetReferences(datasheetReferences);

  if (resolved.foundSlugs.length === 0) {
    return {
      pdfs: {},
      errors: [],
      downloaded: [],
      missing: resolved.missing.map((item) => item.reference),
      found: [],
    };
  }

  const { results, errors } = await downloadMultipleDatasheets(resolved.foundSlugs);
  const downloaded = Object.keys(results);

  const failedDownloads = errors.map((error) => error.filename);
  const missing = uniqueCaseInsensitive([
    ...resolved.missing.map((item) => item.reference),
    ...failedDownloads,
  ]);

  return {
    pdfs: results,
    errors,
    downloaded,
    missing,
    found: resolved.found.filter((item) =>
      downloaded.some((slug) => slug.toLowerCase() === item.datasheetName.toLowerCase())
    ),
  };
}

/**
 * Fusiona: cotizacion + fichas tecnicas.
 * @param {ArrayBuffer} quotePdfBytes
 * @param {Object} datasheetsPdfs - { nombre: ArrayBuffer }
 * @returns {Promise<ArrayBuffer>}
 */
export async function mergeQuoteWithDatasheets(quotePdfBytes, datasheetsPdfs) {
  try {
    const mergedDoc = await PDFDocument.create();

    const quoteDoc = await PDFDocument.load(quotePdfBytes);
    const quotePages = await mergedDoc.copyPages(quoteDoc, quoteDoc.getPageIndices());
    quotePages.forEach((page) => mergedDoc.addPage(page));

    for (const [name, datasheetBytes] of Object.entries(datasheetsPdfs)) {
      try {
        const datasheetDoc = await PDFDocument.load(datasheetBytes);
        const datasheetPages = await mergedDoc.copyPages(datasheetDoc, datasheetDoc.getPageIndices());
        datasheetPages.forEach((page) => mergedDoc.addPage(page));
        console.log(`Ficha agregada al merge: ${name}`);
      } catch (error) {
        console.warn(`No se pudo agregar la ficha ${name}:`, error);
      }
    }

    return await mergedDoc.save();
  } catch (error) {
    console.error('Error fusionando PDFs:', error);
    throw error;
  }
}

/**
 * Flujo completo:
 * 1) Detectar codigos/nombres en cotizacion
 * 2) Resolver referencias en Supabase
 * 3) Descargar fichas disponibles
 * 4) Fusionar en un solo PDF
 * @param {File} quotePdfFile
 * @param {Object} options
 * @param {string[]} options.extraDatasheetReferences - referencias adicionales detectadas por API
 * @returns {Promise<Object>} { success, mergedPdf, datasheetNames, downloaded, missing, errors, found, productCodes, pdfNames, error }
 */
export async function generateMergedPdfWithDatasheets(quotePdfFile, options = {}) {
  try {
    const extraDatasheetReferences = uniqueCaseInsensitive(
      (Array.isArray(options.extraDatasheetReferences) ? options.extraDatasheetReferences : [])
        .map((value) => normalizeReferenceToken(value))
        .filter(Boolean)
    );

    const extractResult = await extractDatasheetNamesFromQuotePdf(quotePdfFile);

    if (!extractResult.success && extraDatasheetReferences.length === 0) {
      return {
        success: false,
        error: extractResult.error,
        mergedPdf: null,
      };
    }

    const datasheetNames = uniqueCaseInsensitive([
      ...(extractResult.success ? extractResult.datasheetNames : []),
      ...extraDatasheetReferences,
    ]);

    if (datasheetNames.length === 0) {
      return {
        success: false,
        error: 'No se detectaron referencias para fichas técnicas en PDF ni en la cotización API.',
        mergedPdf: null,
      };
    }

    const downloadResult = await downloadAllDatasheets(datasheetNames);

    if (Object.keys(downloadResult.pdfs).length === 0) {
      return {
        success: false,
        error: `No se encontro ninguna ficha tecnica en Supabase. Referencias detectadas: ${datasheetNames.join(', ')}`,
        mergedPdf: null,
        datasheetNames,
        downloaded: [],
        missing: downloadResult.missing,
        found: [],
        errors: downloadResult.errors,
        productCodes: extractResult.success ? extractResult.productCodes : [],
        pdfNames: extractResult.success ? extractResult.pdfNames : [],
        apiDatasheetReferences: extraDatasheetReferences,
      };
    }

    const quotePdfBytes = await quotePdfFile.arrayBuffer();
    const mergedPdf = await mergeQuoteWithDatasheets(quotePdfBytes, downloadResult.pdfs);

    return {
      success: true,
      mergedPdf,
      datasheetNames,
      downloaded: downloadResult.downloaded,
      missing: downloadResult.missing,
      found: downloadResult.found,
      errors: downloadResult.errors,
      productCodes: extractResult.success ? extractResult.productCodes : [],
      pdfNames: extractResult.success ? extractResult.pdfNames : [],
      apiDatasheetReferences: extraDatasheetReferences,
      extractionWarning: extractResult.success ? null : extractResult.error,
      error: null,
    };
  } catch (error) {
    console.error('Error en flujo de merge de fichas tecnicas:', error);
    return {
      success: false,
      error: error.message,
      mergedPdf: null,
    };
  }
}
