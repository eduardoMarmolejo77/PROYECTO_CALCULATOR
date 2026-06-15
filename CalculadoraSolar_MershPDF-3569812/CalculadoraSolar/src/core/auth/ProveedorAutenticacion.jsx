import { useCallback, useEffect, useState } from 'react';
import { ContextoAutenticacion } from './contextoAutenticacion';
import {
  cerrarSesion as cerrarSesionServicio,
  completarInicioSesionExterno,
  iniciarSesion as iniciarSesionServicio,
  iniciarSesionMicrosoft as iniciarSesionMicrosoftServicio,
  obtenerUsuarioActual,
  registrarUsuario as registrarUsuarioServicio,
} from './servicioAutenticacion';

export function ProveedorAutenticacion({ children }) {
  const [usuario, establecerUsuario] = useState(() => obtenerUsuarioActual());
  const [cargando, establecerCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function completarSesion() {
      const resultado = await completarInicioSesionExterno();

      if (!activo) return;
      if (resultado?.exito && resultado.usuario) {
        establecerUsuario(resultado.usuario);
      }
      establecerCargando(false);
    }

    completarSesion();

    return () => {
      activo = false;
    };
  }, []);

  const iniciarSesion = useCallback((nombreUsuario, contrasena) => {
    const resultado = iniciarSesionServicio(nombreUsuario, contrasena);
    if (resultado.exito) {
      establecerUsuario(resultado.usuario);
    }
    return resultado;
  }, []);

  const registrarUsuario = useCallback((nombreUsuario, contrasena, nombreCompleto) => {
    return registrarUsuarioServicio(nombreUsuario, contrasena, nombreCompleto);
  }, []);

  const iniciarSesionMicrosoft = useCallback(async () => {
    establecerCargando(true);
    const resultado = await iniciarSesionMicrosoftServicio();

    if (!resultado.exito) {
      establecerCargando(false);
    }

    return resultado;
  }, []);

  const cerrarSesion = useCallback(() => {
    cerrarSesionServicio();
    establecerUsuario(null);
  }, []);

  const valorContexto = {
    usuario,
    cargando,
    iniciarSesion,
    iniciarSesionMicrosoft,
    registrarUsuario,
    cerrarSesion,
    autenticado: !!usuario,
  };

  return (
    <ContextoAutenticacion.Provider value={valorContexto}>
      {children}
    </ContextoAutenticacion.Provider>
  );
}
