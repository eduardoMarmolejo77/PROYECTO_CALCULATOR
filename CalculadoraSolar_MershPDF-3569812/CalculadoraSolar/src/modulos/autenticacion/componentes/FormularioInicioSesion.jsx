import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAutenticacion } from '../../../core/auth/usarAutenticacion';
import Boton from '../../../compartido/componentes/Boton';
import { precargarCatalogo } from '../../cotizacion/configuracion/catalogoProductos';
import '../estilos/autenticacion.css';


export default function FormularioInicioSesion() {
  const { iniciarSesion, iniciarSesionMicrosoft, autenticado } = useAutenticacion();
  const logoPrincipal = `${import.meta.env.BASE_URL}celtec_logo.png`;
  const logoRespaldo = `${import.meta.env.BASE_URL}favicon.svg`;
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoMicrosoft, setCargandoMicrosoft] = useState(false);
  const [logoSrc, setLogoSrc] = useState(logoPrincipal);

  useEffect(() => {
    precargarCatalogo();
  }, []);

  if (autenticado) {
    return <Navigate to="/propuesta" replace />;
  }

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    setError('');
    setCargando(true);

    setTimeout(() => {
      const resultado = iniciarSesion(nombreUsuario, contrasena);
      if (!resultado.exito) {
        setError(resultado.error);
      }
      setCargando(false);
    }, 400);
  };

  const manejarInicioMicrosoft = async () => {
    setError('');
    setCargandoMicrosoft(true);

    const resultado = await iniciarSesionMicrosoft();
    if (!resultado.exito) {
      setError(resultado.error);
      setCargandoMicrosoft(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="bg-pattern" />
      <div className="auth-container animate-fade-in-up">
        <div className="auth-header">
          <img
            src={logoSrc}
            className="auth-logo"
            alt="Logo Celtec"
            onError={() => setLogoSrc(logoRespaldo)}
          />
          <h1 className="auth-title">Propuestas Comerciales</h1>
          <p className="auth-subtitle">Inicia sesión en tu cuenta</p>
        </div>

        <form className="auth-form" onSubmit={manejarEnvio}>
          {error && (
            <div className="auth-error animate-fade-in">
              <span className="auth-error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="login-username" className="auth-label">Usuario</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">👤</span>
              <input
                id="login-username"
                type="text"
                className="auth-input"
                placeholder="Tu nombre de usuario"
                value={nombreUsuario}
                onChange={(evento) => setNombreUsuario(evento.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="login-password" className="auth-label">Contraseña</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="login-password"
                type="password"
                className="auth-input"
                placeholder="Tu contraseña"
                value={contrasena}
                onChange={(evento) => setContrasena(evento.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Boton
            type="submit"
            variant="primary"
            fullWidth
            disabled={cargando || cargandoMicrosoft}
            icon={cargando ? '⏳' : '🔐'}
          >
            {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
          </Boton>
        </form>

        <div className="auth-oauth">
          <div className="auth-separator">
            <span>o</span>
          </div>
          <Boton
            type="button"
            variant="ghost"
            fullWidth
            className="auth-microsoft-button"
            disabled={cargando || cargandoMicrosoft}
            icon={cargandoMicrosoft ? '⏳' : '▦'}
            onClick={manejarInicioMicrosoft}
          >
            {cargandoMicrosoft ? 'Conectando...' : 'Continuar con Microsoft'}
          </Boton>
        </div>

        <div className="auth-footer">
          <p>
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="auth-link">Regístrate aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
