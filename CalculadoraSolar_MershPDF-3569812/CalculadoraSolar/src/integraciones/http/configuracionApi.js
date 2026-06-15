const DEFAULT_API_BASE_URL = '/api/proxy';
const DEFAULT_TOKEN_HEADER = 'Authorization';
const DEFAULT_PROVIDER = 'interfuerza';

function limpiarTexto(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

export function obtenerConfiguracionApi() {
  return {
    baseUrl: limpiarTexto(import.meta.env.VITE_API_BASE_URL, DEFAULT_API_BASE_URL),
    token: limpiarTexto(import.meta.env.VITE_API_TOKEN),
    tokenHeader: limpiarTexto(import.meta.env.VITE_API_TOKEN_HEADER, DEFAULT_TOKEN_HEADER),
    provider: limpiarTexto(import.meta.env.VITE_API_PROVIDER, DEFAULT_PROVIDER).toLowerCase(),
  };
}
