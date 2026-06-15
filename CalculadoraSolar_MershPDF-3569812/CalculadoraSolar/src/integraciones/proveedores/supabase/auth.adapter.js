const PROVEEDOR_MICROSOFT = 'azure';

function obtenerVentana() {
  return typeof window === 'undefined' ? null : window;
}

function normalizarUrlBase(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function obtenerUrlSupabaseDesdeStorage() {
  const storageUrl = String(import.meta.env.VITE_SUPABASE_STORAGE_URL || '').trim();
  const coincidencia = storageUrl.match(/^https:\/\/[^/]+\.supabase\.co/i);
  return coincidencia?.[0] || '';
}

function obtenerUrlSupabase() {
  return normalizarUrlBase(
    import.meta.env.VITE_SUPABASE_URL || obtenerUrlSupabaseDesdeStorage()
  );
}

function obtenerRedirectUrl() {
  const ventana = obtenerVentana();
  const redirectConfigurado = String(import.meta.env.VITE_SUPABASE_REDIRECT_URL || '').trim();

  if (redirectConfigurado) return redirectConfigurado;
  if (!ventana) return '';

  return `${ventana.location.origin}/propuesta`;
}

function limpiarRespuestaOAuthDeUrl() {
  const ventana = obtenerVentana();
  if (!ventana?.history?.replaceState) return;

  ventana.history.replaceState(
    null,
    document.title,
    `${ventana.location.pathname}${ventana.location.search}`
  );
}

function obtenerParametrosOAuth() {
  const ventana = obtenerVentana();
  if (!ventana) return null;

  const parametrosHash = new URLSearchParams(ventana.location.hash.replace(/^#/, ''));
  const parametrosQuery = new URLSearchParams(ventana.location.search.replace(/^\?/, ''));
  const parametros = parametrosHash.size > 0 ? parametrosHash : parametrosQuery;

  if (
    !parametros.has('access_token') &&
    !parametros.has('error') &&
    !parametros.has('error_description')
  ) {
    return null;
  }

  return parametros;
}

function decodificarBase64Url(valor) {
  const base64 = String(valor || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const normalizado = base64.padEnd(base64.length + padding, '=');
  return atob(normalizado);
}

function decodificarJwt(token) {
  try {
    const [, payload] = String(token || '').split('.');
    if (!payload) return null;

    const json = decodificarBase64Url(payload);
    const texto = decodeURIComponent(
      Array.from(json)
        .map((caracter) => `%${caracter.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );

    return JSON.parse(texto);
  } catch {
    return null;
  }
}

async function obtenerUsuarioSupabase(accessToken) {
  const supabaseUrl = obtenerUrlSupabase();
  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !anonKey || !accessToken) return null;

  try {
    const respuesta = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch {
    return null;
  }
}

function normalizarUsuarioOAuth(usuarioExterno = {}, accessToken = '') {
  const claims = decodificarJwt(accessToken) || {};
  const metadata = usuarioExterno.user_metadata || usuarioExterno.userMetadata || claims.user_metadata || {};
  const appMetadata = usuarioExterno.app_metadata || claims.app_metadata || {};
  const email = usuarioExterno.email || claims.email || metadata.email || '';
  const nombre =
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    usuarioExterno.name ||
    claims.name ||
    email.split('@')[0] ||
    'Usuario Microsoft';

  return {
    id: String(usuarioExterno.id || claims.sub || email || Date.now()),
    nombreUsuario: String(email || nombre).trim().toLowerCase(),
    nombreCompleto: String(nombre).trim(),
    email: String(email || '').trim().toLowerCase(),
    proveedor: appMetadata.provider || PROVEEDOR_MICROSOFT,
    inicioSesionEn: new Date().toISOString(),
  };
}

export async function iniciarSesionMicrosoftSupabase() {
  const ventana = obtenerVentana();
  const supabaseUrl = obtenerUrlSupabase();
  const redirectTo = obtenerRedirectUrl();

  if (!ventana) {
    return { exito: false, error: 'El inicio con Microsoft solo está disponible en navegador.' };
  }

  if (!supabaseUrl) {
    return {
      exito: false,
      error: 'Falta configurar VITE_SUPABASE_URL o VITE_SUPABASE_STORAGE_URL para iniciar sesión con Microsoft.',
    };
  }

  const urlAutorizacion = new URL(`${supabaseUrl}/auth/v1/authorize`);
  urlAutorizacion.searchParams.set('provider', PROVEEDOR_MICROSOFT);
  urlAutorizacion.searchParams.set('scopes', 'email');
  if (redirectTo) {
    urlAutorizacion.searchParams.set('redirect_to', redirectTo);
  }

  ventana.location.assign(urlAutorizacion.toString());
  return { exito: true };
}

export async function obtenerSesionOAuthSupabaseDesdeUrl() {
  const parametros = obtenerParametrosOAuth();
  if (!parametros) return null;

  const error = parametros.get('error_description') || parametros.get('error');
  if (error) {
    limpiarRespuestaOAuthDeUrl();
    return { exito: false, error: decodeURIComponent(error.replace(/\+/g, ' ')) };
  }

  const accessToken = parametros.get('access_token');
  if (!accessToken) return null;

  const usuarioExterno = await obtenerUsuarioSupabase(accessToken);
  const usuario = normalizarUsuarioOAuth(usuarioExterno || {}, accessToken);
  limpiarRespuestaOAuthDeUrl();

  return {
    exito: true,
    usuario,
  };
}
