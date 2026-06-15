import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../../../core/auth/usarAutenticacion';
import Boton from '../../../compartido/componentes/Boton';
import '../estilos/autenticacion.css';

export default function FormularioRegistro() {
  const { registrarUsuario, autenticado } = useAutenticacion();
  const logoPrincipal = `${import.meta.env.BASE_URL}celtec_logo.png`;
  const logoRespaldo = `${import.meta.env.BASE_URL}favicon.svg`;
  const [logoSrc, setLogoSrc] = useState(logoPrincipal);
  const navegar = useNavigate();
  const [datosFormulario, setDatosFormulario] = useState({
    nombreCompleto: '',
    nombreUsuario: '',
    contrasena: '',
    confirmarContrasena: '',
  });
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  if (autenticado) {
    return <Navigate to="/propuesta" replace />;
  }

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setDatosFormulario((anterior) => ({ ...anterior, [name]: value }));
  };

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    setError('');
    setExito('');

    if (datosFormulario.contrasena !== datosFormulario.confirmarContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);

    setTimeout(() => {
      const resultado = registrarUsuario(
        datosFormulario.nombreUsuario,
        datosFormulario.contrasena,
        datosFormulario.nombreCompleto
      );

      if (resultado.exito) {
        setExito('¡Cuenta creada exitosamente! Redirigiendo al login...');
        setTimeout(() => navegar('/iniciar-sesion'), 1500);
      } else {
        setError(resultado.error);
      }

      setCargando(false);
    }, 400);
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
          <h1 className="auth-title">Crear Cuenta</h1>
          <p className="auth-subtitle">Regístrate para acceder a la herramienta</p>
        </div>

        <form className="auth-form" onSubmit={manejarEnvio}>
          {error && (
            <div className="auth-error animate-fade-in">
              <span className="auth-error-icon">⚠️</span>
              {error}
            </div>
          )}
          {exito && (
            <div className="auth-success animate-fade-in">
              <span className="auth-error-icon">✅</span>
              {exito}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="reg-fullname" className="auth-label">Nombre Completo</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🏷️</span>
              <input
                id="reg-fullname"
                type="text"
                name="nombreCompleto"
                className="auth-input"
                placeholder="Tu nombre completo"
                value={datosFormulario.nombreCompleto}
                onChange={manejarCambio}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-username" className="auth-label">Usuario</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">👤</span>
              <input
                id="reg-username"
                type="text"
                name="nombreUsuario"
                className="auth-input"
                placeholder="Elige un nombre de usuario"
                value={datosFormulario.nombreUsuario}
                onChange={manejarCambio}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password" className="auth-label">Contraseña</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="reg-password"
                type="password"
                name="contrasena"
                className="auth-input"
                placeholder="Mínimo 4 caracteres"
                value={datosFormulario.contrasena}
                onChange={manejarCambio}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-confirm" className="auth-label">Confirmar Contraseña</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="reg-confirm"
                type="password"
                name="confirmarContrasena"
                className="auth-input"
                placeholder="Repite tu contraseña"
                value={datosFormulario.confirmarContrasena}
                onChange={manejarCambio}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <Boton
            type="submit"
            variant="primary"
            fullWidth
            disabled={cargando}
            icon={cargando ? '⏳' : '📝'}
          >
            {cargando ? 'Creando cuenta...' : 'Registrarse'}
          </Boton>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link to="/iniciar-sesion" className="auth-link">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
