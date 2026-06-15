import { useCallback, useState } from 'react';
import Boton from '../../../compartido/componentes/Boton';
import { generarPdfFusionadoConFichas } from '../servicios/servicioFichasPdf';
import '../estilos/fusion.css';

function sanitizarNombreArchivo(nombre) {
  return (nombre || 'cotizacion')
    .replace(/\.pdf$/i, '')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'cotizacion';
}

function descargarBytes(bytes, nombreArchivo) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function valoresUnicosSinDuplicar(lista) {
  const mapa = new Map();

  lista.forEach((valor) => {
    const texto = String(valor || '').trim();
    if (!texto) return;
    const llave = texto.toLowerCase();
    if (!mapa.has(llave)) mapa.set(llave, texto);
  });

  return [...mapa.values()];
}

/**
 * Genera la fusión entre cotización y fichas técnicas disponibles.
 */
export default function GeneradorPdfFusionado({
  cotizacionPdf,
  numeroCotizacion,
  referenciasFichasExtra = [],
  disabled,
  className,
  id,
  alCompletarFusion,
}) {
  const [fusionando, setFusionando] = useState(false);
  const [resultadoFusion, setResultadoFusion] = useState(null);

  const manejarGeneracionPdf = useCallback(async () => {
    setResultadoFusion(null);

    if (!cotizacionPdf?.file) {
      setResultadoFusion({
        tipo: 'error',
        titulo: 'Carga primero el PDF de cotización.',
        detalle: 'Selecciona una cotización válida antes de intentar fusionar fichas técnicas.',
      });
      return;
    }

    setFusionando(true);
    try {
      const resultado = await generarPdfFusionadoConFichas(cotizacionPdf.file, {
        referenciasFichasExtra,
        referenciasFichasResueltas: cotizacionPdf.foundDatasheetNames || cotizacionPdf.datasheetNames || [],
        bytesPdfCotizacion: cotizacionPdf.bytes,
      });

      if (!resultado.success) {
        setResultadoFusion({
          tipo: 'error',
          titulo: 'No se pudo generar la fusión.',
          detalle: resultado.error,
        });
        return;
      }

      const nombreArchivo = `${sanitizarNombreArchivo(cotizacionPdf.name)}_con ficha tecnica`;
      descargarBytes(resultado.mergedPdf, nombreArchivo);

      const cantidadDescargadas = resultado.downloaded?.length || 0;
      const referenciasFaltantes = valoresUnicosSinDuplicar([
        ...(resultado.missing || []),
        ...(cotizacionPdf.missingDatasheetNames || []),
      ]);
      const faltantes = referenciasFaltantes.length;

      setResultadoFusion({
        tipo: faltantes > 0 ? 'advertencia' : 'exito',
        titulo: faltantes > 0
          ? 'Fusión completada con referencias pendientes.'
          : 'Fusión completada correctamente.',
        detalle: faltantes > 0
          ? `Se adjuntaron ${cantidadDescargadas} ficha(s). Algunas referencias no se encontraron.`
          : `Se adjuntaron ${cantidadDescargadas} ficha(s).`,
        referenciasFaltantes,
      });

      if (alCompletarFusion) {
        alCompletarFusion();
      }

      try {
        const claveHistorial = 'propuestas_app_history';
        const historialExistente = JSON.parse(localStorage.getItem(claveHistorial) || '[]');
        const nuevaEntrada = {
          id: Date.now(),
          quoteNumber: numeroCotizacion,
          quoteFileName: cotizacionPdf.name,
          quotePages: cotizacionPdf.pages,
          date: new Date().toISOString(),
          mode: 'datasheets',
          datasheetCount: resultado.downloaded?.length || 0,
          downloadedDatasheets: resultado.downloaded || [],
          missingDatasheets: referenciasFaltantes,
          apiDatasheetReferences: referenciasFichasExtra,
        };

        localStorage.setItem(claveHistorial, JSON.stringify([nuevaEntrada, ...historialExistente]));
      } catch (errorHistorial) {
        console.error('Error guardando historial:', errorHistorial);
      }
    } catch (error) {
      console.error('Error fusionando cotización y fichas técnicas:', error);
      setResultadoFusion({
        tipo: 'error',
        titulo: 'Hubo un error al hacer la fusión.',
        detalle: 'Verifica la configuración de la cotización.',
      });
    } finally {
      setFusionando(false);
    }
  }, [alCompletarFusion, cotizacionPdf, numeroCotizacion, referenciasFichasExtra]);

  return (
    <div className="generador-fusion">
      <Boton
        id={id}
        className={className}
        variant="success"
        icon="🧩"
        disabled={disabled || fusionando}
        onClick={manejarGeneracionPdf}
        fullWidth
      >
        {fusionando ? 'Fusionando...' : 'Hacer fusión de PDF'}
      </Boton>

      {resultadoFusion && (
        <div className={`resultado-fusion resultado-fusion--${resultadoFusion.tipo}`} role="status">
          <div className="resultado-fusion__encabezado">
            <span className="resultado-fusion__titulo">{resultadoFusion.titulo}</span>
            <span className="resultado-fusion__detalle">{resultadoFusion.detalle}</span>
          </div>

          {resultadoFusion.referenciasFaltantes?.length > 0 && (
            <details className="resultado-fusion__faltantes">
              <summary>
                Algunos no se encontraron. ¿Deseas ver cuáles son?
                <span>{resultadoFusion.referenciasFaltantes.length}</span>
              </summary>
              <ul>
                {resultadoFusion.referenciasFaltantes.map((referencia) => (
                  <li key={referencia}>{referencia}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
