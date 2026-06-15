const CLAVES_SESSION_STORAGE_SESION = [
  'calculadora_solar_borrador_v1',
  'consulta_cotizacion_estado_v1',
];

const CLAVES_LOCAL_STORAGE_SESION = [
  'propuestas_app_history',
];

export function limpiarDatosSesionAplicacion() {
  if (typeof window === 'undefined') return;

  CLAVES_SESSION_STORAGE_SESION.forEach((clave) => {
    window.sessionStorage.removeItem(clave);
  });

  CLAVES_LOCAL_STORAGE_SESION.forEach((clave) => {
    window.localStorage.removeItem(clave);
  });
}
