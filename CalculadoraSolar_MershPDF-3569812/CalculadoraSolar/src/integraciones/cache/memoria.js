export function crearCacheConTTL({ ttlMs = 5 * 60 * 1000 } = {}) {
  let valor = null;
  let timestamp = 0;
  let promesaActiva = null;

  function estaVigente() {
    return Boolean(valor) && Date.now() - timestamp < ttlMs;
  }

  return {
    obtener() {
      return estaVigente() ? valor : null;
    },
    guardar(siguienteValor) {
      valor = siguienteValor;
      timestamp = Date.now();
      return valor;
    },
    limpiar() {
      valor = null;
      timestamp = 0;
      promesaActiva = null;
    },
    obtenerPromesaActiva() {
      return promesaActiva;
    },
    fijarPromesaActiva(promesa) {
      promesaActiva = promesa;
      return promesaActiva;
    },
    limpiarPromesaActiva() {
      promesaActiva = null;
    },
  };
}
