import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Boton from '../../../compartido/componentes/Boton';
import {
  construirNombrePdfFusionado,
  formatearTamanoArchivo,
  fusionarArchivosPdf,
  normalizarArchivosPdf,
} from '../servicios/servicioMershPdf';
import '../estilos/mershPDF.css';

function descargarBytesPdf(bytes, nombreArchivo) {
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

function llaveArchivo(archivo) {
  return `${archivo.name}-${archivo.size}-${archivo.lastModified}`;
}

export default function MershPdfWorkspace() {
  const navigate = useNavigate();
  const inputArchivosRef = useRef(null);
  const itemRefs = useRef(new Map());
  const posicionesPreviasRef = useRef(new Map());
  const frameAnimacionRef = useRef(0);
  const [archivos, setArchivos] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [archivoArrastradoId, setArchivoArrastradoId] = useState('');
  const [movimientoActivo, setMovimientoActivo] = useState({ id: '', direccion: '' });
  const [procesandoCarga, setProcesandoCarga] = useState(false);
  const [fusionando, setFusionando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const totalPaginas = useMemo(
    () => archivos.reduce((total, archivo) => total + (archivo.pages || 0), 0),
    [archivos]
  );

  const registrarArchivoRef = useCallback((idArchivo, nodo) => {
    if (nodo) {
      itemRefs.current.set(idArchivo, nodo);
      return;
    }

    itemRefs.current.delete(idArchivo);
    posicionesPreviasRef.current.delete(idArchivo);
  }, []);

  useLayoutEffect(() => {
    if (frameAnimacionRef.current) {
      window.cancelAnimationFrame(frameAnimacionRef.current);
    }

    const posicionesActuales = new Map();

    archivos.forEach((archivo) => {
      const nodo = itemRefs.current.get(archivo.id);
      if (!nodo) return;
      posicionesActuales.set(archivo.id, nodo.getBoundingClientRect().top);
    });

    posicionesActuales.forEach((posicionActual, idArchivo) => {
      const posicionPrevia = posicionesPreviasRef.current.get(idArchivo);
      const nodo = itemRefs.current.get(idArchivo);
      if (!nodo || posicionPrevia === undefined) return;

      const delta = posicionPrevia - posicionActual;
      if (delta === 0) return;

      frameAnimacionRef.current = window.requestAnimationFrame(() => {
        nodo.getAnimations().forEach((animacion) => animacion.cancel());
        nodo.animate(
          [
            {
              transform: `translateY(${delta}px)`,
              boxShadow: '0 14px 28px rgba(10, 37, 64, 0.08)',
            },
            {
              transform: 'translateY(0)',
              boxShadow: '0 0 0 rgba(10, 37, 64, 0)',
            },
          ],
          {
            duration: 360,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }
        );
      });
    });

    posicionesPreviasRef.current = posicionesActuales;

    return () => {
      if (frameAnimacionRef.current) {
        window.cancelAnimationFrame(frameAnimacionRef.current);
      }
    };
  }, [archivos]);

  const agregarArchivos = useCallback(async (listaArchivos) => {
    setError('');
    setResultado(null);

    if (!listaArchivos || listaArchivos.length === 0) return;

    setProcesandoCarga(true);
    try {
      const archivosNormalizados = await normalizarArchivosPdf(listaArchivos);
      setArchivos((previo) => {
        const existentes = new Set(previo.map((archivo) => llaveArchivo(archivo)));
        const nuevos = archivosNormalizados.filter((archivo) => !existentes.has(llaveArchivo(archivo)));
        return [...previo, ...nuevos];
      });
    } catch (errorCarga) {
      setError(errorCarga?.message || 'No se pudieron cargar los PDFs seleccionados.');
    } finally {
      setProcesandoCarga(false);
    }
  }, []);

  const manejarCambioInput = async (evento) => {
    await agregarArchivos(evento.target.files);
    evento.target.value = '';
  };

  const manejarDrop = async (evento) => {
    evento.preventDefault();
    setArrastrando(false);
    await agregarArchivos(evento.dataTransfer?.files);
  };

  const quitarArchivo = (idArchivo) => {
    setArchivos((previo) => previo.filter((archivo) => archivo.id !== idArchivo));
    setResultado(null);
  };

  const moverArchivo = useCallback((idArchivo, direccion) => {
    setArchivos((previo) => {
      const indiceActual = previo.findIndex((archivo) => archivo.id === idArchivo);
      if (indiceActual < 0) return previo;

      const indiceDestino = direccion === 'up' ? indiceActual - 1 : indiceActual + 1;
      if (indiceDestino < 0 || indiceDestino >= previo.length) return previo;

      const siguiente = [...previo];
      const [archivo] = siguiente.splice(indiceActual, 1);
      siguiente.splice(indiceDestino, 0, archivo);
      return siguiente;
    });
    setMovimientoActivo({
      id: idArchivo,
      direccion: direccion === 'up' ? 'arriba' : 'abajo',
    });
    setResultado(null);
  }, []);

  const reordenarArchivo = useCallback((idOrigen, idDestino) => {
    if (!idOrigen || !idDestino || idOrigen === idDestino) return;

    setArchivos((previo) => {
      const indiceOrigen = previo.findIndex((archivo) => archivo.id === idOrigen);
      const indiceDestino = previo.findIndex((archivo) => archivo.id === idDestino);
      if (indiceOrigen < 0 || indiceDestino < 0) return previo;

      const siguiente = [...previo];
      const [archivo] = siguiente.splice(indiceOrigen, 1);
      siguiente.splice(indiceDestino, 0, archivo);
      return siguiente;
    });
    setMovimientoActivo({
      id: idOrigen,
      direccion: archivos.findIndex((archivo) => archivo.id === idOrigen) > archivos.findIndex((archivo) => archivo.id === idDestino)
        ? 'arriba'
        : 'abajo',
    });
    setResultado(null);
  }, [archivos]);

  const limpiarTodo = () => {
    setArchivos([]);
    setResultado(null);
    setError('');
    setArchivoArrastradoId('');
  };

  const manejarFusion = async () => {
    setError('');
    setResultado(null);

    if (archivos.length === 0) {
      setError('Sube al menos un PDF antes de hacer el mersh.');
      return;
    }

    setFusionando(true);
    try {
      const bytesFusionados = await fusionarArchivosPdf(archivos);
      const nombreArchivo = construirNombrePdfFusionado(archivos);
      descargarBytesPdf(bytesFusionados, nombreArchivo);
      setResultado({
        tipo: 'success',
        titulo: 'Mersh completado correctamente.',
        detalle: `Se fusionaron ${archivos.length} PDF(s) en un solo archivo descargable.`,
      });
    } catch (errorFusion) {
      setError(errorFusion?.message || 'No se pudo completar el mersh de los PDFs.');
    } finally {
      setFusionando(false);
    }
  };

  return (
    <>
      <div className="pagina-propuesta">
        <div className="pagina-propuesta__encabezado">
          <h1 className="pagina-propuesta__titulo">
            <span>🧩</span>
            Mersh de PDF
          </h1>
          <p className="pagina-propuesta__subtitulo">
            Sube varios PDFs por separado, arrástralos o selecciónalos desde tu equipo y descarga un solo PDF fusionado.
          </p>
        </div>

        <div className="pagina-propuesta__cuadricula mersh-pdf__cuadricula">
          <div className="pagina-propuesta__columna">
            <div className="tarjeta-propuesta animate-fade-in-up">
              <h3 className="tarjeta-propuesta__titulo">
                <span className="tarjeta-propuesta__icono">📂</span>
                Cargar PDFs
              </h3>

              <input
                ref={inputArchivosRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="mersh-pdf__input"
                onChange={manejarCambioInput}
              />

              <div
                className={`mersh-pdf__zona ${arrastrando ? 'mersh-pdf__zona--activa' : ''}`}
                onDragEnter={(evento) => {
                  evento.preventDefault();
                  setArrastrando(true);
                }}
                onDragOver={(evento) => {
                  evento.preventDefault();
                  if (!arrastrando) setArrastrando(true);
                }}
                onDragLeave={(evento) => {
                  evento.preventDefault();
                  if (evento.currentTarget.contains(evento.relatedTarget)) return;
                  setArrastrando(false);
                }}
                onDrop={manejarDrop}
              >
                <span className="mersh-pdf__zona-icono">{procesandoCarga ? '⏳' : '📄'}</span>
                <strong>{procesandoCarga ? 'Procesando PDFs...' : 'Arrastra tus PDFs aquí'}</strong>
                <p>También puedes seleccionarlos manualmente desde tu equipo.</p>
                <Boton
                  type="button"
                  variant="primary"
                  icon="📎"
                  onClick={() => inputArchivosRef.current?.click()}
                >
                  Seleccionar PDFs
                </Boton>
              </div>

              {error && (
                <div className="estado-prompt estado-prompt--error" role="status">
                  {error}
                </div>
              )}

              {resultado && (
                <div className={`estado-prompt estado-prompt--${resultado.tipo}`} role="status">
                  <strong>{resultado.titulo}</strong> {resultado.detalle}
                </div>
              )}
            </div>
          </div>

          <div className="pagina-propuesta__columna">
            <div className="tarjeta-propuesta animate-fade-in-up">
              <h3 className="tarjeta-propuesta__titulo">
                <span className="tarjeta-propuesta__icono">🗂️</span>
                Documentos a fusionar
              </h3>

              <div className="mersh-pdf__resumen">
                <span>{archivos.length} PDF(s)</span>
                <span>{totalPaginas} página(s) en total</span>
              </div>

              <div className="mersh-pdf__lista">
                {archivos.length === 0 ? (
                  <div className="mersh-pdf__vacio">
                    <span>📭</span>
                    <p>Todavía no has agregado PDFs.</p>
                  </div>
                ) : (
                  archivos.map((archivo, indice) => (
                    <div
                      key={archivo.id}
                      ref={(nodo) => registrarArchivoRef(archivo.id, nodo)}
                      className={`mersh-pdf__archivo ${archivoArrastradoId === archivo.id ? 'mersh-pdf__archivo--arrastrando' : ''} ${movimientoActivo.id === archivo.id ? `mersh-pdf__archivo--moviendo-${movimientoActivo.direccion}` : ''}`}
                      draggable
                      onAnimationEnd={() => {
                        if (movimientoActivo.id === archivo.id) {
                          setMovimientoActivo({ id: '', direccion: '' });
                        }
                      }}
                      onDragStart={() => setArchivoArrastradoId(archivo.id)}
                      onDragEnd={() => setArchivoArrastradoId('')}
                      onDragOver={(evento) => evento.preventDefault()}
                      onDrop={(evento) => {
                        evento.preventDefault();
                        reordenarArchivo(archivoArrastradoId, archivo.id);
                        setArchivoArrastradoId('');
                      }}
                    >
                      <div className="mersh-pdf__archivo-info">
                        <span className="mersh-pdf__archivo-orden">#{indice + 1}</span>
                        <div>
                          <strong className="mersh-pdf__archivo-nombre">{archivo.name}</strong>
                          <span className="mersh-pdf__archivo-meta">
                            {archivo.pages} página(s) · {formatearTamanoArchivo(archivo.size)}
                          </span>
                        </div>
                      </div>
                      <div className="mersh-pdf__archivo-acciones">
                        <button
                          type="button"
                          className="mersh-pdf__archivo-mover"
                          onClick={() => moverArchivo(archivo.id, 'up')}
                          disabled={indice === 0}
                          title="Mover arriba"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="mersh-pdf__archivo-mover"
                          onClick={() => moverArchivo(archivo.id, 'down')}
                          disabled={indice === archivos.length - 1}
                          title="Mover abajo"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="mersh-pdf__archivo-quitar"
                          onClick={() => quitarArchivo(archivo.id)}
                          title="Quitar archivo"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pagina-propuesta__acciones mersh-pdf__acciones">
          <Boton variant="ghost" icon="◀️" onClick={() => navigate('/propuesta')} fullWidth>
            Volver a Propuesta
          </Boton>
          <Boton variant="ghost" icon="🧹" onClick={limpiarTodo} fullWidth disabled={archivos.length === 0}>
            Limpiar lista
          </Boton>
          <Boton
            variant="success"
            icon={fusionando ? '⏳' : '🧩'}
            onClick={manejarFusion}
            fullWidth
            disabled={fusionando || procesandoCarga || archivos.length === 0}
          >
            {fusionando ? 'Fusionando PDFs...' : 'Descargar mersh PDF'}
          </Boton>
        </div>
      </div>
    </>
  );
}
