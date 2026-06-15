import Boton from '../../../compartido/componentes/Boton';

export default function PantallaConfirmacion({
  resultadoCreacion,
  cargandoFusion,
  cargandoCotizacionSolo,
  puedeVerCotizacionSolo,
  alVolver,
  alVerCotizacionConFicha,
  alVerCotizacionSolo,
  error,
  mensajeFusion,
}) {
  const bloqueoAcciones = cargandoFusion || cargandoCotizacionSolo;
  const estadoVisual = error ? 'alerta' : mensajeFusion ? 'exito' : 'pendiente';
  const iconoEstado = error ? '⚠️' : mensajeFusion ? '✅' : '📄';

  return (
    <div className="pagina-propuesta__confirmacion">
      <div className="tarjeta-confirmacion animate-fade-in-up">
        <div className={`tarjeta-confirmacion__icono tarjeta-confirmacion__icono--${estadoVisual}`}>
          {iconoEstado}
        </div>
        <h2>La cotización ha sido creada</h2>
        <p className="tarjeta-confirmacion__id">
          ID: {resultadoCreacion?.idCotizacion || 'N/D'}
        </p>

        <div className="tarjeta-confirmacion__acciones">
          <Boton
            variant="ghost"
            icon="◀️"
            onClick={alVolver}
            fullWidth
            disabled={bloqueoAcciones}
          >
            Volver
          </Boton>

          <Boton
            variant="success"
            icon={cargandoFusion ? '⏳' : '📄'}
            onClick={alVerCotizacionConFicha}
            fullWidth
            disabled={bloqueoAcciones}
          >
            {cargandoFusion ? 'Preparando cotización...' : 'Ver cotización con ficha técnica'}
          </Boton>

          {puedeVerCotizacionSolo && (
            <Boton
              variant="secondary"
              icon={cargandoCotizacionSolo ? '⏳' : '📄'}
              onClick={alVerCotizacionSolo}
              fullWidth
              disabled={bloqueoAcciones}
            >
              {cargandoCotizacionSolo ? 'Preparando cotización...' : 'Ver solo cotización'}
            </Boton>
          )}
        </div>

        {mensajeFusion && (
          <div className="tarjeta-confirmacion__exito">
            <span>✅</span> {mensajeFusion}
          </div>
        )}

        {error && (
          <div className="alerta-propuesta alerta-propuesta--compacta tarjeta-confirmacion__error">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>
    </div>
  );
}
