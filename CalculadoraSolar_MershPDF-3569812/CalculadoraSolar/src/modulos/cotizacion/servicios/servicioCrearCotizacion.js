import { obtenerAdapter } from '../../../integraciones/proveedores';
import { validarPayloadCotizacion } from '../esquemas/validacionCotizacion';

export async function crearCotizacionEnInterfuerza(datosInternos = {}) {
  const errores = validarPayloadCotizacion(datosInternos);
  if (errores.length > 0) {
    throw new Error(errores.join(' '));
  }

  try {
    const respuesta = await obtenerAdapter().crearCotizacion(datosInternos);

    if (respuesta?.raw?.error || respuesta?.error) {
      throw new Error(String(respuesta?.raw?.error || respuesta?.error));
    }

    const id = respuesta?.id || '';

    if (!id) {
      throw new Error('La API respondió sin ID de cotización.');
    }

    return {
      exito: true,
      id: String(id),
      numero: String(id),
      raw: respuesta.raw,
    };
  } catch (error) {
    const mensaje = String(error?.message || error);

    if (/autoriz|token|ip autorizada|interfuerza devolvi[oó] html|not permitted/i.test(mensaje)) {
      throw new Error('Error de autenticación con la API. Verifica token e IP autorizada.', {
        cause: error,
      });
    }

    if (/tiempo de espera agotado|timeout/i.test(mensaje)) {
      throw new Error('El servidor está tardando más de lo esperado. Intenta de nuevo.', {
        cause: error,
      });
    }

    if (/no se pudo conectar|failed to fetch/i.test(mensaje)) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.', {
        cause: error,
      });
    }

    throw new Error(mensaje || 'Error desconocido al crear la cotización.', { cause: error });
  }
}
