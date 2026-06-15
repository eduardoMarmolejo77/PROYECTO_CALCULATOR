// Servicio para acceso a Storage público de Supabase
// Usando URLs públicas directas (sin cliente Supabase)
// Formato URL: https://[project_id].supabase.co/storage/v1/object/public/[bucket]/[folder]/[file]

const URL_ALMACENAMIENTO = import.meta.env.VITE_SUPABASE_STORAGE_URL || '';
const DEFAULT_DOWNLOAD_CONCURRENCY = 4;
const existenceCache = new Map();
const downloadCache = new Map();

function getStorageBaseUrl() {
  return URL_ALMACENAMIENTO.endsWith('/') ? URL_ALMACENAMIENTO : `${URL_ALMACENAMIENTO}/`;
}

function encodeStoragePath(path) {
  return String(path || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function getFinalPdfName(filename) {
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
}

function getDatasheetUrl(filename) {
  return `${getStorageBaseUrl()}${encodeStoragePath(getFinalPdfName(filename))}`;
}

function cacheKeyForFilename(filename) {
  return getFinalPdfName(filename);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(concurrency, 1), items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

/**
 * Descarga un PDF desde Supabase Storage público
 * @param {string} filename - Nombre del archivo (ej: "LR5-54HTB-435M.pdf")
 * @returns {Promise<ArrayBuffer>} Contenido del PDF
 */
export async function downloadDatasheetPdf(filename) {
  if (!URL_ALMACENAMIENTO) {
    throw new Error('VITE_SUPABASE_STORAGE_URL no configurada en .env.local');
  }

  const finalName = getFinalPdfName(filename);
  const cacheKey = cacheKeyForFilename(finalName);
  const cachedDownload = downloadCache.get(cacheKey);

  if (cachedDownload) {
    return cachedDownload;
  }

  const url = getDatasheetUrl(filename);

  const downloadPromise = (async () => {
    console.log(`📥 Descargando: ${finalName}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`✓ Descargado: ${finalName} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
    return arrayBuffer;
  })();

  downloadCache.set(cacheKey, downloadPromise);

  try {
    return await downloadPromise;
  } catch (error) {
    downloadCache.delete(cacheKey);
    console.error(`✗ Error descargando ${finalName}:`, error);
    throw new Error(`No se pudo descargar ficha: ${finalName} - ${error.message}`, { cause: error });
  }
}

/**
 * Descarga múltiples PDFs
 * @param {string[]} filenames - Array de nombres de archivos
 * @returns {Promise<Object>} { results: {filename: ArrayBuffer}, errors: [{filename, error}] }
 */
export async function downloadMultipleDatasheets(filenames, options = {}) {
  const { concurrency = DEFAULT_DOWNLOAD_CONCURRENCY } = options;
  const uniqueFilenames = [
    ...new Map(
      filenames
        .map((filename) => String(filename || '').trim())
        .filter(Boolean)
        .map((filename) => [filename.toLowerCase(), filename])
    ).values(),
  ];
  const results = {};
  const errors = [];

  const downloads = await mapWithConcurrency(uniqueFilenames, concurrency, async (filename) => {
    try {
      return {
        filename,
        bytes: await downloadDatasheetPdf(filename),
        error: null,
      };
    } catch (error) {
      return {
        filename,
        bytes: null,
        error,
      };
    }
  });

  downloads.forEach(({ filename, bytes, error }) => {
    if (error) {
      errors.push({
        filename,
        error: error.message,
      });
      console.warn(`Saltando: ${filename}`);
      return;
    }

    results[filename] = bytes;
  });

  return { results, errors };
}

/**
 * Verifica si un PDF existe en Storage sin descargarlo
 * @param {string} filename 
 * @returns {Promise<boolean>}
 */
export async function datasheetExists(filename) {
  if (!URL_ALMACENAMIENTO) return false;

  const cacheKey = cacheKeyForFilename(filename);
  if (existenceCache.has(cacheKey)) {
    return existenceCache.get(cacheKey);
  }

  const url = getDatasheetUrl(filename);

  const existencePromise = (async () => {
    try {
      const headResponse = await fetch(url, { method: 'HEAD' });
      if (headResponse.ok) return true;
      if (![403, 405].includes(headResponse.status)) return false;
    } catch {
      // Algunos buckets/CDN permiten GET publico pero bloquean HEAD o CORS para HEAD.
    }

    const getResponse = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    });
    return getResponse.ok;
  })();

  existenceCache.set(cacheKey, existencePromise);

  try {
    const exists = await existencePromise;
    existenceCache.set(cacheKey, exists);
    return exists;
  } catch {
    existenceCache.set(cacheKey, false);
    return false;
  }
}

/**
 * Obtiene la URL pública de un datasheet (sin descargarlo)
 * @param {string} filename 
 * @returns {string} URL pública del archivo
 */
export function getDatasheetPublicUrl(filename) {
  if (!URL_ALMACENAMIENTO) return '';
  
  return getDatasheetUrl(filename);
}

// API pública en español.
export const descargarFichaPdf = downloadDatasheetPdf;
export const descargarMultiplesFichas = downloadMultipleDatasheets;
export const existeFicha = datasheetExists;
export const obtenerUrlPublicaFicha = getDatasheetPublicUrl;
