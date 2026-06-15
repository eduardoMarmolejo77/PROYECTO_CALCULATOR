import { useEffect, useMemo, useState } from 'react';
import BarraNavegacion from '../../../core/navegacion/BarraNavegacion';
import Boton from '../../../compartido/componentes/Boton';
import CampoEntrada from '../../../compartido/componentes/CampoEntrada';
import {
  obtenerCatalogo,
  obtenerCatalogoEnCache,
  obtenerCotizacionPorId,
} from '../../cotizacion/configuracion/catalogoProductos';
import { generarPdfCotizacionDesdeApi } from '../../pdf/servicios/servicioPdfCotizacion';
import {
  enriquecerLineasCotizacionConProductos,
  extraerReferenciasFichasDesdeLineasCotizacion,
  generarPdfFusionadoConFichas,
  verificarFichasDisponibles,
} from '../../pdf/servicios/servicioFichasPdf';
import '../../cotizacion/estilos/propuesta.css';
import '../estilos/consultaCotizacion.css';

const CLAVE_ESTADO_CONSULTA = 'consulta_cotizacion_estado_v1';

const ESTADO_CONSULTA_INICIAL = {
  numeroCotizacion: '',
  cotizacion: null,
  pdfBytes: null,
  referenciasFichas: [],
  fichasDisponibles: [],
  descargarConFichas: true,
  estado: { tipo: '', mensaje: '' },
};

function bytesABase64(bytes) {
  if (!bytes) return '';

  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binario = '';
  const tamanoBloque = 0x8000;

  for (let indice = 0; indice < uint8.length; indice += tamanoBloque) {
    binario += String.fromCharCode(...uint8.subarray(indice, indice + tamanoBloque));
  }

  return window.btoa(binario);
}

function base64ABytes(base64) {
  if (!base64) return null;

  const binario = window.atob(base64);
  const bytes = new Uint8Array(binario.length);

  for (let indice = 0; indice < binario.length; indice += 1) {
    bytes[indice] = binario.charCodeAt(indice);
  }

  return bytes;
}

function cargarEstadoConsultaPersistido() {
  if (typeof window === 'undefined') return { ...ESTADO_CONSULTA_INICIAL };

  try {
    const crudo = window.sessionStorage.getItem(CLAVE_ESTADO_CONSULTA);
    if (!crudo) return { ...ESTADO_CONSULTA_INICIAL };

    const guardado = JSON.parse(crudo);

    return {
      ...ESTADO_CONSULTA_INICIAL,
      ...guardado,
      pdfBytes: base64ABytes(guardado.pdfBase64),
      referenciasFichas: Array.isArray(guardado.referenciasFichas) ? guardado.referenciasFichas : [],
      fichasDisponibles: Array.isArray(guardado.fichasDisponibles) ? guardado.fichasDisponibles : [],
      estado: guardado.estado || ESTADO_CONSULTA_INICIAL.estado,
    };
  } catch (error) {
    console.warn('No se pudo restaurar la consulta de cotizacion:', error);
    return { ...ESTADO_CONSULTA_INICIAL };
  }
}

function guardarEstadoConsultaPersistido(estado) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      CLAVE_ESTADO_CONSULTA,
      JSON.stringify({
        numeroCotizacion: estado.numeroCotizacion,
        cotizacion: estado.cotizacion,
        referenciasFichas: estado.referenciasFichas,
        fichasDisponibles: estado.fichasDisponibles,
        descargarConFichas: estado.descargarConFichas,
        estado: estado.estado,
        pdfBase64: bytesABase64(estado.pdfBytes),
      })
    );
  } catch (error) {
    console.warn('No se pudo guardar la consulta de cotizacion:', error);
  }
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

function sanitizarNombreArchivo(valor) {
  return String(valor || 'cotizacion')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'cotizacion';
}

function formatoMoneda(valor) {
  const numero = Number.parseFloat(valor);
  if (!Number.isFinite(numero)) return '$0.00';
  return numero.toLocaleString('es-PA', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function leerCampo(objeto, ...claves) {
  for (const clave of claves) {
    const valor = objeto?.[clave];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return valor;
    }
  }

  return '';
}

function normalizarReferenciasFichas(lineas = []) {
  const referencias = extraerReferenciasFichasDesdeLineasCotizacion(lineas);
  return [
    ...(referencias.datasheetNames || []),
    ...(referencias.productCodes || []),
    ...(referencias.pdfNames || []),
    ...(referencias.fallbackCodes || []),
  ];
}

function valoresUnicos(lista = []) {
  const mapa = new Map();
  lista.forEach((valor) => {
    const texto = String(valor || '').trim();
    if (!texto) return;
    const llave = texto.toLowerCase();
    if (!mapa.has(llave)) mapa.set(llave, texto);
  });

  return [...mapa.values()];
}

function normalizarClaveReferencia(valor) {
  return String(valor || '')
    .replace(/\.pdf$/i, '')
    .trim()
    .toLowerCase();
}

export default function PaginaConsultaCotizacion() {
  const catalogoEnCache = obtenerCatalogoEnCache();
  const estadoInicialConsulta = useMemo(() => cargarEstadoConsultaPersistido(), []);
  const [numeroCotizacion, setNumeroCotizacion] = useState(() => estadoInicialConsulta.numeroCotizacion);
  const [cotizacion, setCotizacion] = useState(() => estadoInicialConsulta.cotizacion);
  const [pdfBytes, setPdfBytes] = useState(() => estadoInicialConsulta.pdfBytes);
  const [referenciasFichas, setReferenciasFichas] = useState(() => estadoInicialConsulta.referenciasFichas);
  const [fichasDisponibles, setFichasDisponibles] = useState(() => estadoInicialConsulta.fichasDisponibles);
  const [productosCatalogo, setProductosCatalogo] = useState(() => catalogoEnCache?.products || []);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [descargarConFichas, setDescargarConFichas] = useState(() => estadoInicialConsulta.descargarConFichas);
  const [estado, setEstado] = useState(() => estadoInicialConsulta.estado);

  useEffect(() => {
    guardarEstadoConsultaPersistido({
      numeroCotizacion,
      cotizacion,
      pdfBytes,
      referenciasFichas,
      fichasDisponibles,
      descargarConFichas,
      estado,
    });
  }, [
    cotizacion,
    descargarConFichas,
    estado,
    fichasDisponibles,
    numeroCotizacion,
    pdfBytes,
    referenciasFichas,
  ]);

  useEffect(() => {
    let componenteMontado = true;

    async function precargarCatalogo() {
      if (productosCatalogo.length > 0) return;

      const catalogoActual = obtenerCatalogoEnCache();
      if (catalogoActual?.products?.length > 0) {
        setProductosCatalogo(catalogoActual.products);
        return;
      }

      setCargandoCatalogo(true);
      try {
        const catalogo = await obtenerCatalogo();
        if (componenteMontado) setProductosCatalogo(catalogo.products || []);
      } catch (errorCatalogo) {
        console.warn('No se pudo precargar el catalogo para fichas tecnicas:', errorCatalogo);
      } finally {
        if (componenteMontado) setCargandoCatalogo(false);
      }
    }

    precargarCatalogo();

    return () => {
      componenteMontado = false;
    };
  }, [productosCatalogo.length]);

  const lineas = useMemo(
    () => (Array.isArray(cotizacion?.lines) ? cotizacion.lines : []),
    [cotizacion]
  );
  const lineasConFicha = useMemo(() => {
    if (lineas.length === 0 || fichasDisponibles.length === 0) return [];

    const fichasDisponiblesNormalizadas = new Set(
      fichasDisponibles.map(normalizarClaveReferencia).filter(Boolean)
    );

    return lineas.filter((linea) => {
      const referenciasLinea = valoresUnicos(normalizarReferenciasFichas([linea]));
      return referenciasLinea.some((referencia) =>
        fichasDisponiblesNormalizadas.has(normalizarClaveReferencia(referencia))
      );
    });
  }, [fichasDisponibles, lineas]);
  const pdfUrl = useMemo(
    () => (pdfBytes ? URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' })) : ''),
    [pdfBytes]
  );
  const nombreArchivoBase = useMemo(
    () => `${sanitizarNombreArchivo(cotizacion?.id || numeroCotizacion || 'cotizacion')}.pdf`,
    [cotizacion?.id, numeroCotizacion]
  );

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const obtenerProductosParaFichas = async () => {
    if (productosCatalogo.length > 0) return productosCatalogo;

    const catalogoActual = obtenerCatalogoEnCache();
    if (catalogoActual?.products?.length > 0) {
      setProductosCatalogo(catalogoActual.products);
      return catalogoActual.products;
    }

    setCargandoCatalogo(true);
    try {
      const catalogo = await obtenerCatalogo();
      const productos = catalogo.products || [];
      setProductosCatalogo(productos);
      return productos;
    } finally {
      setCargandoCatalogo(false);
    }
  };

  const consultarCotizacion = async (evento) => {
    evento.preventDefault();
    const id = numeroCotizacion.trim();

    if (!id) {
      setEstado({ tipo: 'error', mensaje: 'Ingresa el No de cotizacion.' });
      return;
    }

    setConsultando(true);
    setCotizacion(null);
    setPdfBytes(null);
    setReferenciasFichas([]);
    setFichasDisponibles([]);
    setEstado({ tipo: '', mensaje: '' });

    try {
      const datosCotizacion = await obtenerCotizacionPorId(id);
      const bytes = await generarPdfCotizacionDesdeApi(datosCotizacion);
      const productos = await obtenerProductosParaFichas();
      const lineasEnriquecidas = enriquecerLineasCotizacionConProductos(datosCotizacion.lines, productos);
      const referencias = valoresUnicos(normalizarReferenciasFichas(lineasEnriquecidas));

      let disponibles = [];
      let avisoFichas = '';
      if (referencias.length > 0) {
        try {
          const disponibilidad = await verificarFichasDisponibles(referencias);
          disponibles = disponibilidad.foundSlugs || [];
        } catch (errorFichas) {
          avisoFichas = errorFichas?.message || 'No se pudieron verificar las fichas tecnicas.';
        }
      }

      setCotizacion({
        ...datosCotizacion,
        lines: lineasEnriquecidas,
      });
      setPdfBytes(bytes);
      setReferenciasFichas(referencias);
      setFichasDisponibles(disponibles);
      setEstado({
        tipo: avisoFichas ? 'alerta' : 'exito',
        mensaje: avisoFichas
          ? `Cotizacion ${datosCotizacion.id || id} lista. ${avisoFichas}`
          : `Cotizacion ${datosCotizacion.id || id} lista para revisar.`,
      });
    } catch (error) {
      setEstado({
        tipo: 'error',
        mensaje: error?.message || 'No se pudo consultar la cotizacion.',
      });
    } finally {
      setConsultando(false);
    }
  };

  const descargarCotizacion = async () => {
    if (!pdfBytes || !cotizacion) return;

    setDescargando(true);
    setEstado({ tipo: '', mensaje: '' });

    try {
      if (!descargarConFichas) {
        descargarBytes(pdfBytes, nombreArchivoBase);
        setEstado({ tipo: 'exito', mensaje: 'Cotizacion descargada correctamente.' });
        return;
      }

      if (referenciasFichas.length === 0) {
        setEstado({
          tipo: 'alerta',
          mensaje: 'No se detectaron referencias de fichas tecnicas en esta cotizacion.',
        });
        return;
      }

      const archivoPdf = new File([pdfBytes], nombreArchivoBase, { type: 'application/pdf' });
      const resultado = await generarPdfFusionadoConFichas(archivoPdf, {
        referenciasFichasExtra: referenciasFichas,
        referenciasFichasResueltas: fichasDisponibles,
        bytesPdfCotizacion: pdfBytes,
      });

      if (!resultado.success) {
        setEstado({
          tipo: 'error',
          mensaje: resultado.error || 'No se pudo generar la cotizacion con fichas tecnicas.',
        });
        return;
      }

      descargarBytes(
        resultado.mergedPdf,
        `${sanitizarNombreArchivo(cotizacion.id || numeroCotizacion)}_con_fichas_tecnicas.pdf`
      );
      setEstado({
        tipo: (resultado.missing || []).length > 0 ? 'alerta' : 'exito',
        mensaje: (resultado.missing || []).length > 0
          ? `Descarga lista. Se adjuntaron ${(resultado.downloaded || []).length} ficha(s) y quedaron ${(resultado.missing || []).length} pendiente(s).`
          : `Descarga lista con ${(resultado.downloaded || []).length} ficha(s) tecnica(s).`,
      });
    } catch (error) {
      setEstado({
        tipo: 'error',
        mensaje: error?.message || 'No se pudo descargar la cotizacion.',
      });
    } finally {
      setDescargando(false);
    }
  };

  return (
    <>
      <BarraNavegacion />
      <main className="pagina-propuesta pagina-consulta-cotizacion">
        <section className="pagina-propuesta__encabezado consulta-cotizacion__encabezado">
          <div>
            <h1 className="pagina-propuesta__titulo">
              <span>🔎</span>
              Consultar cotizacion
            </h1>
            <p className="pagina-propuesta__subtitulo">
              Busca por No de cotizacion, revisa la previsualizacion y descarga el PDF con fichas tecnicas cuando aplique.
            </p>
          </div>
        </section>

        <form className="tarjeta-propuesta consulta-cotizacion__busqueda animate-fade-in-up" onSubmit={consultarCotizacion}>
          <CampoEntrada
            id="numero-cotizacion"
            label="No de cotizacion"
            value={numeroCotizacion}
            onChange={(evento) => setNumeroCotizacion(evento.target.value)}
            placeholder="Ej: 12345"
            disabled={consultando}
            required
          />
          <Boton type="submit" icon="🔍" disabled={consultando}>
            {consultando ? 'Consultando...' : 'Consultar'}
          </Boton>
        </form>

        {estado.mensaje && (
          <div className={`consulta-cotizacion__estado consulta-cotizacion__estado--${estado.tipo || 'info'} animate-fade-in`} role="status">
            {estado.mensaje}
          </div>
        )}

        {cotizacion && (
          <section className="consulta-cotizacion__contenido animate-fade-in-up">
            <div className="consulta-cotizacion__panel">
              <div className="consulta-cotizacion__resumen">
                <div>
                  <span>No de cotizacion</span>
                  <strong>{cotizacion.id || numeroCotizacion}</strong>
                </div>
                <div>
                  <span>Cliente</span>
                  <strong>{cotizacion.customerName || 'N/D'}</strong>
                </div>
                <div>
                  <span>Fecha</span>
                  <strong>{cotizacion.date || 'N/D'}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatoMoneda(cotizacion.total)}</strong>
                </div>
              </div>

              <div className="consulta-cotizacion__opciones">
                <label className="consulta-cotizacion__toggle">
                  <input
                    type="checkbox"
                    checked={descargarConFichas}
                    onChange={(evento) => setDescargarConFichas(evento.target.checked)}
                  />
                  <span>descargar con fichas tecnicas</span>
                </label>
                <Boton
                  type="button"
                  variant="success"
                  icon="⬇️"
                  disabled={!pdfBytes || descargando}
                  onClick={descargarCotizacion}
                >
                  {descargando ? 'Preparando descarga...' : 'Descargar'}
                </Boton>
              </div>

              <div className="consulta-cotizacion__fichas">
                <span className={`consulta-cotizacion__fichas-disponibles ${fichasDisponibles.length > 0 ? 'consulta-cotizacion__fichas-disponibles--ok' : 'consulta-cotizacion__fichas-disponibles--vacio'}`}>
                  {fichasDisponibles.length} ficha(s) disponible(s)
                </span>
                {cargandoCatalogo && <span>Cargando catalogo...</span>}
              </div>

              <div className="consulta-cotizacion__tabla">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Codigo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineasConFicha.length === 0 ? (
                      <tr>
                        <td colSpan="2">No hay productos con ficha tecnica disponible.</td>
                      </tr>
                    ) : lineasConFicha.map((linea, index) => {
                      const nombre = leerCampo(linea, 'Nombre', 'Name', 'Descripcion', 'Descripción', 'Description') || 'Producto';
                      const codigo = leerCampo(linea, 'Codigo', 'Código', 'Item_Number', 'ItemNumber', 'id') || 'N/D';

                      return (
                        <tr key={`${codigo}-${index}`}>
                          <td>{nombre}</td>
                          <td>{codigo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="consulta-cotizacion__preview">
              {pdfUrl ? (
                <iframe
                  title={`Previsualizacion de cotizacion ${cotizacion.id || numeroCotizacion}`}
                  src={pdfUrl}
                />
              ) : (
                <div className="consulta-cotizacion__preview-vacia">
                  Generando previsualizacion...
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
