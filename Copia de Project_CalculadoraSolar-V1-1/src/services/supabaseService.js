// Servicio para acceso a Storage público de Supabase
// Usando URLs públicas directas (sin cliente Supabase)
// Formato URL: https://[project_id].supabase.co/storage/v1/object/public/[bucket]/[folder]/[file]

const STORAGE_URL = import.meta.env.VITE_SUPABASE_STORAGE_URL || '';

function getStorageBaseUrl() {
  return STORAGE_URL.endsWith('/') ? STORAGE_URL : `${STORAGE_URL}/`;
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

/**
 * Descarga un PDF desde Supabase Storage público
 * @param {string} filename - Nombre del archivo (ej: "LR5-54HTB-435M.pdf")
 * @returns {Promise<ArrayBuffer>} Contenido del PDF
 */
export async function downloadDatasheetPdf(filename) {
  if (!STORAGE_URL) {
    throw new Error('VITE_SUPABASE_STORAGE_URL no configurada en .env.local');
  }

  const finalName = getFinalPdfName(filename);
  const url = getDatasheetUrl(filename);
  
  try {
    console.log(`📥 Descargando: ${finalName}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`✓ Descargado: ${finalName} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
    return arrayBuffer;
  } catch (error) {
    console.error(`✗ Error descargando ${finalName}:`, error);
    throw new Error(`No se pudo descargar datasheet: ${finalName} - ${error.message}`, { cause: error });
  }
}

/**
 * Descarga múltiples PDFs
 * @param {string[]} filenames - Array de nombres de archivos
 * @returns {Promise<Object>} { results: {filename: ArrayBuffer}, errors: [{filename, error}] }
 */
export async function downloadMultipleDatasheets(filenames) {
  const results = {};
  const errors = [];

  for (const filename of filenames) {
    try {
      results[filename] = await downloadDatasheetPdf(filename);
    } catch (error) {
      errors.push({ 
        filename, 
        error: error.message 
      });
      console.warn(`Saltando: ${filename}`);
    }
  }

  return { results, errors };
}

/**
 * Verifica si un PDF existe en Storage sin descargarlo
 * @param {string} filename 
 * @returns {Promise<boolean>}
 */
export async function datasheetExists(filename) {
  if (!STORAGE_URL) return false;

  const url = getDatasheetUrl(filename);
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Obtiene la URL pública de un datasheet (sin descargarlo)
 * @param {string} filename 
 * @returns {string} URL pública del archivo
 */
export function getDatasheetPublicUrl(filename) {
  if (!STORAGE_URL) return '';
  
  return getDatasheetUrl(filename);
}
