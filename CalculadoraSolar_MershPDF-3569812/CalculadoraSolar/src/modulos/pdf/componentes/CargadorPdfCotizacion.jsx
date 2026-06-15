import { useId, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import Boton from '../../../compartido/componentes/Boton';
import { obtenerCotizacionPorId } from '../../cotizacion/configuracion/catalogoProductos';
import {
  enriquecerLineasCotizacionConProductos,
  verificarFichasDisponibles,
  extraerNombresFichasDesdePdfCotizacion,
  extraerIdsCotizacionDesdePdfCotizacion,
  extraerReferenciasFichasDesdeLineasCotizacion,
} from '../servicios/servicioFichasPdf';
import '../estilos/fusion.css';

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

function formatearTamanoArchivo(bytes) {
  if (!Number.isFinite(bytes)) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function obtenerPrimeraCotizacionDisponible(idsCotizacion) {
  const candidatos = valoresUnicosSinDuplicar(idsCotizacion).slice(0, 8);
  let ultimoError = null;

  for (const candidato of candidatos) {
    try {
      const cotizacion = await obtenerCotizacionPorId(candidato);
      return { cotizacion, idCoincidente: candidato, error: null };
    } catch (error) {
      ultimoError = error;
    }
  }

  return { cotizacion: null, idCoincidente: null, error: ultimoError };
}

/**
 * Carga y valida el PDF de cotización, además detecta fichas técnicas.
 */
export default function CargadorPdfCotizacion({ valor, alCambiar, productos = [] }) {
  const idEntrada = useId();
  const [error, setError] = useState('');
  const [leyendoArchivo, setLeyendoArchivo] = useState(false);

  const manejarCambioArchivo = async (evento) => {
    const archivo = evento.target.files?.[0];
    setError('');

    if (!archivo) return;

    const esPdf = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      setError('Carga un archivo PDF válido.');
      alCambiar(null);
      evento.target.value = '';
      return;
    }

    setLeyendoArchivo(true);
    try {
      const bytes = await archivo.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      const resultadoIdsCotizacion = await extraerIdsCotizacionDesdePdfCotizacion(archivo, {
        pdfBytes: bytes,
        maxPages: 1,
      });
      let referenciasDetectadasPdf = [];
      let idsCotizacionDetectados = resultadoIdsCotizacion.quoteIds || [];
      let referenciasFichaApi = [];
      let datosCotizacionApi = null;
      let errorConsultaApi = '';
      let nombresFichasEncontradas = [];
      let nombresFichasFaltantes = [];

      if (idsCotizacionDetectados.length > 0) {
        const consultaApi = await obtenerPrimeraCotizacionDisponible(idsCotizacionDetectados);

        if (consultaApi.cotizacion) {
          const lineasEnriquecidas = enriquecerLineasCotizacionConProductos(consultaApi.cotizacion.lines, productos);
          const referenciasApi = extraerReferenciasFichasDesdeLineasCotizacion(lineasEnriquecidas);
          referenciasFichaApi = referenciasApi.datasheetNames || [];
          datosCotizacionApi = {
            quoteId: consultaApi.cotizacion.id || consultaApi.idCoincidente,
            matchedId: consultaApi.idCoincidente,
            customerName: consultaApi.cotizacion.customerName || '',
            linesCount: consultaApi.cotizacion.lines?.length || 0,
            datasheetReferences: referenciasFichaApi,
          };
        } else {
          errorConsultaApi = `Se detectó la cotización ${idsCotizacionDetectados.join(', ')}, pero no se pudo leer.`;
        }
      } else {
        errorConsultaApi = 'No se reconoció el número de cotización dentro del PDF.';
      }

      if (referenciasFichaApi.length === 0) {
        const resultadoExtraccion = await extraerNombresFichasDesdePdfCotizacion(archivo, {
          pdfBytes: bytes,
          skipOcr: Boolean(datosCotizacionApi),
        });

        referenciasDetectadasPdf = resultadoExtraccion.success ? resultadoExtraccion.datasheetNames : [];

        if (!datosCotizacionApi && resultadoExtraccion.quoteIds?.length > 0) {
          idsCotizacionDetectados = valoresUnicosSinDuplicar([
            ...idsCotizacionDetectados,
            ...resultadoExtraccion.quoteIds,
          ]);
          const consultaApi = await obtenerPrimeraCotizacionDisponible(idsCotizacionDetectados);

          if (consultaApi.cotizacion) {
            const lineasEnriquecidas = enriquecerLineasCotizacionConProductos(consultaApi.cotizacion.lines, productos);
            const referenciasApi = extraerReferenciasFichasDesdeLineasCotizacion(lineasEnriquecidas);
            referenciasFichaApi = referenciasApi.datasheetNames || [];
            datosCotizacionApi = {
              quoteId: consultaApi.cotizacion.id || consultaApi.idCoincidente,
              matchedId: consultaApi.idCoincidente,
              customerName: consultaApi.cotizacion.customerName || '',
              linesCount: consultaApi.cotizacion.lines?.length || 0,
              datasheetReferences: referenciasFichaApi,
            };
            errorConsultaApi = '';
          }
        }
      }

      const referenciasDetectadas = valoresUnicosSinDuplicar([
        ...referenciasDetectadasPdf,
        ...referenciasFichaApi,
      ]);

      if (referenciasDetectadas.length === 0) {
        setError(errorConsultaApi || 'No se detectaron códigos de producto o nombres de fichas en esta cotización.');
      } else {
        const disponibilidad = await verificarFichasDisponibles(referenciasDetectadas);
        nombresFichasEncontradas = disponibilidad.foundSlugs || [];
        nombresFichasFaltantes = disponibilidad.missing || [];

        if (nombresFichasEncontradas.length === 0) {
          setError('Se detectaron códigos, pero no se encontró ninguna ficha.');
        } else if (nombresFichasFaltantes.length > 0) {
          setError(`Se encontraron ${nombresFichasEncontradas.length} ficha(s), pero ${nombresFichasFaltantes.length} no existen base de los datos.`);
        } else if (errorConsultaApi) {
          setError(errorConsultaApi);
        }
      }

      alCambiar({
        file: archivo,
        bytes,
        name: archivo.name,
        size: archivo.size,
        pages: pdf.getPageCount(),
        loadedAt: new Date().toISOString(),
        datasheetNames: nombresFichasEncontradas,
        foundDatasheetNames: nombresFichasEncontradas,
        missingDatasheetNames: nombresFichasFaltantes,
        pdfDetectedDatasheetReferences: referenciasDetectadasPdf,
        apiDatasheetReferences: referenciasFichaApi,
        detectedDatasheetReferences: referenciasDetectadas,
        detectedQuoteIds: idsCotizacionDetectados,
        quoteApiData: datosCotizacionApi,
        apiLookupError: errorConsultaApi,
      });
    } catch (errorLectura) {
      console.error('Error leyendo PDF de cotización:', errorLectura);
      setError('No se pudo leer el PDF. Verifica que no esté dañado o protegido.');
      alCambiar(null);
      evento.target.value = '';
    } finally {
      setLeyendoArchivo(false);
    }
  };

  const limpiarArchivo = () => {
    alCambiar(null);
    setError('');
  };

  const nombresFichasEncontradas = valor?.foundDatasheetNames || valor?.datasheetNames || [];
  const nombresFichasFaltantes = valor?.missingDatasheetNames || [];
  const cantidadEncontradas = nombresFichasEncontradas.length;
  const cantidadFaltantes = nombresFichasFaltantes.length;
  const datosCotizacionApi = valor?.quoteApiData;

  return (
    <div className="tarjeta-propuesta cargador-cotizacion animate-fade-in-up">
      <h3 className="tarjeta-propuesta__titulo">
        <span className="tarjeta-propuesta__icono">📎</span>
        Cotización PDF
      </h3>

      <div className={`cargador-cotizacion__zona ${valor ? 'cargador-cotizacion__zona--lista' : ''}`}>
        <input
          id={idEntrada}
          className="cargador-cotizacion__entrada"
          type="file"
          accept="application/pdf,.pdf"
          onChange={manejarCambioArchivo}
        />
        <label htmlFor={idEntrada} className="cargador-cotizacion__etiqueta">
          <span className="cargador-cotizacion__icono">{leyendoArchivo ? '⏳' : valor ? '✅' : '📄'}</span>
          <span className="cargador-cotizacion__principal">
            {leyendoArchivo ? 'Leyendo cotización...' : valor ? 'PDF leído correctamente' : 'Cargar cotización en PDF'}
          </span>
          <span className="cargador-cotizacion__pista">
            {valor
              ? `${valor.pages} página${valor.pages === 1 ? '' : 's'} · ${formatearTamanoArchivo(valor.size)}`
              : 'Se extraerán códigos/fichas automáticamente'}
          </span>
        </label>
      </div>

      {valor && (
        <div className="cargador-cotizacion__archivo">
          <div>
            <span className="cargador-cotizacion__nombre-archivo">{valor.name}</span>
            {datosCotizacionApi && (
              <span className="cargador-cotizacion__meta">
                Cotización API: {datosCotizacionApi.quoteId} · {datosCotizacionApi.linesCount} línea{datosCotizacionApi.linesCount === 1 ? '' : 's'}
              </span>
            )}
            <span className="cargador-cotizacion__meta">
              {cantidadEncontradas > 0
                ? `${cantidadEncontradas} ficha${cantidadEncontradas === 1 ? '' : 's'} encontrada${cantidadEncontradas === 1 ? '' : 's'}${cantidadFaltantes > 0 ? ` · ${cantidadFaltantes} pendiente${cantidadFaltantes === 1 ? '' : 's'}` : ''}`
                : 'No se encontraron fichas'}
            </span>
          </div>
          <Boton type="button" variant="ghost" icon="🗑️" onClick={limpiarArchivo}>
            Quitar
          </Boton>
        </div>
      )}

      {valor && (cantidadEncontradas > 0 || cantidadFaltantes > 0) && (
        <div className="cargador-cotizacion__fichas">
          <div className="lista-fichas">
            {cantidadEncontradas > 0 && (
              <>
                <p className="lista-fichas__titulo">✅ Fichas encontradas:</p>
                <ul className="lista-fichas__elementos">
                  {nombresFichasEncontradas.map((nombre) => (
                    <li key={nombre} className="lista-fichas__elemento">
                      <span className="lista-fichas__icono">📄</span>
                      <span>{nombre}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {cantidadFaltantes > 0 && (
              <details className="lista-fichas__detalles-faltantes">
                <summary>
                  Algunos no se encontraron. ¿Deseas ver cuáles son?
                  <span>{cantidadFaltantes}</span>
                </summary>
                <ul className="lista-fichas__elementos lista-fichas__elementos--faltantes">
                  {nombresFichasFaltantes.map((nombre) => (
                    <li key={nombre} className="lista-fichas__elemento lista-fichas__elemento--faltante">
                      <span className="lista-fichas__icono">❌</span>
                      <span>{nombre}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="alerta-propuesta alerta-propuesta--compacta">
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
}
