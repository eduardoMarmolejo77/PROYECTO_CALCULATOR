import { PDFDocument } from 'pdf-lib';

function crearIdArchivo(archivo) {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${archivo.name}-${archivo.size}-${archivo.lastModified}-${Date.now()}`;
}

export function formatearTamanoArchivo(bytes) {
  if (!Number.isFinite(bytes)) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function esArchivoPdfValido(archivo) {
  if (!archivo) return false;
  return archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
}

export async function normalizarArchivosPdf(listaArchivos = []) {
  const archivos = Array.from(listaArchivos || []).filter(Boolean);
  const resultados = [];

  for (const archivo of archivos) {
    if (!esArchivoPdfValido(archivo)) {
      throw new Error(`"${archivo.name}" no es un PDF válido.`);
    }

    const bytes = await archivo.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);

    resultados.push({
      id: crearIdArchivo(archivo),
      file: archivo,
      bytes,
      name: archivo.name,
      size: archivo.size,
      pages: pdf.getPageCount(),
      lastModified: archivo.lastModified,
    });
  }

  return resultados;
}

export async function fusionarArchivosPdf(archivos = []) {
  if (!Array.isArray(archivos) || archivos.length === 0) {
    throw new Error('Agrega al menos un PDF para fusionar.');
  }

  const pdfFinal = await PDFDocument.create();

  for (const archivo of archivos) {
    const pdfOrigen = await PDFDocument.load(archivo.bytes);
    const paginas = await pdfFinal.copyPages(pdfOrigen, pdfOrigen.getPageIndices());
    paginas.forEach((pagina) => pdfFinal.addPage(pagina));
  }

  return pdfFinal.save();
}

export function construirNombrePdfFusionado() {
  return 'Cotizacion+ficha.pdf';
}
