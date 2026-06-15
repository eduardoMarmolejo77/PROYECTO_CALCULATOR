import { limpiarDatosSesionAplicacion } from '../sesion/limpiezaSesion';
import {
  iniciarSesionMicrosoftSupabase,
  obtenerSesionOAuthSupabaseDesdeUrl,
} from '../../integraciones/proveedores/supabase/auth.adapter';

const CLAVE_USUARIOS = 'propuestas_app_users';
const CLAVE_SESION = 'propuestas_app_session';

function codificarContrasena(contrasena) {
  // Codificacion simple para demo. No usar en produccion.
  return btoa(encodeURIComponent(contrasena));
}

function normalizarUsuarioGuardado(usuario = {}) {
  const nombreUsuario = String(usuario.nombreUsuario || usuario.username || '').trim().toLowerCase();
  const nombreCompleto = String(usuario.nombreCompleto || usuario.fullName || '').trim();

  return {
    id: String(usuario.id || ''),
    nombreUsuario,
    contrasena: String(usuario.contrasena || usuario.password || ''),
    nombreCompleto,
    creadoEn: usuario.creadoEn || usuario.createdAt || new Date().toISOString(),
  };
}

function normalizarSesionGuardada(sesion = {}) {
  return {
    id: String(sesion.id || ''),
    nombreUsuario: String(sesion.nombreUsuario || sesion.username || '').trim().toLowerCase(),
    nombreCompleto: String(sesion.nombreCompleto || sesion.fullName || '').trim(),
    email: String(sesion.email || '').trim().toLowerCase(),
    proveedor: sesion.proveedor || 'local',
    inicioSesionEn: sesion.inicioSesionEn || sesion.loginAt || new Date().toISOString(),
  };
}

function obtenerUsuarios() {
  try {
    const datos = localStorage.getItem(CLAVE_USUARIOS);
    const usuarios = datos ? JSON.parse(datos) : [];
    return Array.isArray(usuarios) ? usuarios.map(normalizarUsuarioGuardado) : [];
  } catch {
    return [];
  }
}

function guardarUsuarios(usuarios) {
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios));
}

function guardarSesion(sesion) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

export function registrarUsuario(nombreUsuario, contrasena, nombreCompleto) {
  const usuarios = obtenerUsuarios();
  const nombreUsuarioNormalizado = String(nombreUsuario || '').trim().toLowerCase();
  const nombreCompletoNormalizado = String(nombreCompleto || '').trim();

  const yaExiste = usuarios.some(
    (usuario) => usuario.nombreUsuario === nombreUsuarioNormalizado
  );
  if (yaExiste) {
    return { exito: false, error: 'El nombre de usuario ya está registrado.' };
  }

  if (!nombreUsuarioNormalizado || nombreUsuarioNormalizado.length < 3) {
    return { exito: false, error: 'El usuario debe tener al menos 3 caracteres.' };
  }
  if (!contrasena || String(contrasena).length < 4) {
    return { exito: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
  }
  if (!nombreCompletoNormalizado || nombreCompletoNormalizado.length < 2) {
    return { exito: false, error: 'El nombre completo es requerido.' };
  }

  const nuevoUsuario = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    nombreUsuario: nombreUsuarioNormalizado,
    contrasena: codificarContrasena(contrasena),
    nombreCompleto: nombreCompletoNormalizado,
    creadoEn: new Date().toISOString(),
  };

  usuarios.push(nuevoUsuario);
  guardarUsuarios(usuarios);

  return {
    exito: true,
    usuario: {
      id: nuevoUsuario.id,
      nombreUsuario: nuevoUsuario.nombreUsuario,
      nombreCompleto: nuevoUsuario.nombreCompleto,
    },
  };
}

export function iniciarSesion(nombreUsuario, contrasena) {
  const usuarios = obtenerUsuarios();
  const contrasenaCodificada = codificarContrasena(contrasena);
  const nombreUsuarioNormalizado = String(nombreUsuario || '').trim().toLowerCase();

  const usuario = usuarios.find(
    (item) =>
      item.nombreUsuario === nombreUsuarioNormalizado &&
      item.contrasena === contrasenaCodificada
  );

  if (!usuario) {
    return { exito: false, error: 'Usuario o contraseña incorrectos.' };
  }

  const sesion = {
    id: usuario.id,
    nombreUsuario: usuario.nombreUsuario,
    nombreCompleto: usuario.nombreCompleto,
    inicioSesionEn: new Date().toISOString(),
  };

  guardarSesion(sesion);
  return { exito: true, usuario: sesion };
}

export async function iniciarSesionMicrosoft() {
  return iniciarSesionMicrosoftSupabase();
}

export async function completarInicioSesionExterno() {
  const resultado = await obtenerSesionOAuthSupabaseDesdeUrl();

  if (resultado?.exito && resultado.usuario) {
    guardarSesion(resultado.usuario);
  }

  return resultado;
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
  limpiarDatosSesionAplicacion();
}

export function obtenerUsuarioActual() {
  try {
    const datos = localStorage.getItem(CLAVE_SESION);
    return datos ? normalizarSesionGuardada(JSON.parse(datos)) : null;
  } catch {
    return null;
  }
}
