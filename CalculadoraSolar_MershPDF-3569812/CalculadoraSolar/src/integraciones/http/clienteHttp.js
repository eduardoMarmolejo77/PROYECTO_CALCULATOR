import { llamarApi } from './clienteApi';

export async function clienteHttp({
  clase = 'GET',
  action,
  data = null,
  parametros = {},
  timeoutMs = 30000,
} = {}) {
  if (!action) {
    throw new Error('clienteHttp requiere una acción de API.');
  }

  return llamarApi({
    payload: {
      class: clase,
      action,
      ...(data ? { data } : {}),
      ...parametros,
    },
    timeoutMs,
  });
}

export const httpApi = {
  get(action, parametros = {}, opciones = {}) {
    return clienteHttp({
      clase: 'GET',
      action,
      parametros,
      timeoutMs: opciones.timeoutMs,
    });
  },

  put(action, data = {}, opciones = {}) {
    return clienteHttp({
      clase: 'PUT',
      action,
      data,
      timeoutMs: opciones.timeoutMs,
    });
  },
};
