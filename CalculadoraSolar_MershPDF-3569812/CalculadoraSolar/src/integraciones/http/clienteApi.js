import { obtenerConfiguracionApi } from './configuracionApi';

function resolverUrlBaseCliente(baseUrl) {
  if (/^https?:\/\//i.test(String(baseUrl || '').trim())) {
    return '/api/proxy';
  }

  return String(baseUrl || '').trim() || '/api/proxy';
}

function construirUrl(baseUrl, parametros) {
  if (!parametros || Object.keys(parametros).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl, window.location.origin);
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return;
    url.searchParams.set(clave, String(valor));
  });

  if (/^https?:\/\//i.test(baseUrl)) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

function timeoutSignal(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return { signal: undefined, cleanup: () => {} };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => window.clearTimeout(timer),
  };
}

function parsearErrorApi(respuestaTexto, status) {
  const texto = String(respuestaTexto || '').trim();

  if (!texto) {
    return `API error (${status}).`;
  }

  const pareceHtml = /<html|<title|<!doctype html/i.test(texto);
  if (pareceHtml) {
    if (/interfuerza api/i.test(texto) || /not permitted/i.test(texto)) {
      return 'Error de autenticación con la API. Verifica el token y la IP autorizada.';
    }

    return `API error (${status}): respuesta HTML inesperada.`;
  }

  try {
    const json = JSON.parse(texto);
    return json?.error || json?.message || `API error (${status}).`;
  } catch {
    return `API error (${status}): ${texto.slice(0, 180)}`;
  }
}

export async function llamarApi({
  payload = null,
  metodo = 'POST',
  parametros = null,
  headers = {},
  timeoutMs = 30000,
} = {}) {
  const config = obtenerConfiguracionApi();
  const urlBaseCliente = resolverUrlBaseCliente(config.baseUrl);
  const url = construirUrl(urlBaseCliente, parametros);
  const { signal, cleanup } = timeoutSignal(timeoutMs);

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(config.token ? { [config.tokenHeader]: config.token } : {}),
        ...headers,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const texto = await respuesta.text();

    if (!respuesta.ok) {
      throw new Error(parsearErrorApi(texto, respuesta.status));
    }

    const textoLimpio = texto.trim();
    if (!textoLimpio) return {};

    try {
      const data = JSON.parse(textoLimpio);
      if (typeof data?.error === 'string' && data.error.trim()) {
        throw new Error(data.error);
      }
      return data;
    } catch (errorParseo) {
      if (/<html|<title|<!doctype html/i.test(textoLimpio)) {
        throw new Error('La API devolvió HTML en lugar de JSON. Revisa token y permisos.', {
          cause: errorParseo,
        });
      }

      throw new Error(`La API devolvió JSON inválido: ${textoLimpio.slice(0, 180)}`, {
        cause: errorParseo,
      });
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al consultar la API.', { cause: error });
    }

    if (error instanceof TypeError && /fetch/i.test(error.message)) {
      throw new Error('No se pudo conectar con el servidor API.', { cause: error });
    }

    throw error;
  } finally {
    cleanup();
  }
}
