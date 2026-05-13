import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import './auth.css';

export default function RegisterForm() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Si ya está autenticado, redirigir al dashboard
  if (isAuthenticated) {
    return <Navigate to="/proposal" replace />;
  }

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const result = register(formData.username, formData.password, formData.fullName);
      if (result.success) {
        setSuccess('¡Cuenta creada exitosamente! Redirigiendo al login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="auth-page">
      <div className="bg-pattern" />
      <div className="auth-container animate-fade-in-up">
        <div className="auth-header">
          <div className="auth-logo">🚀</div>
          <h1 className="auth-title">Crear Cuenta</h1>
          <p className="auth-subtitle">Regístrate para acceder a la herramienta</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error animate-fade-in">
              <span className="auth-error-icon">⚠️</span>
              {error}
            </div>
          )}
          {success && (
            <div className="auth-success animate-fade-in">
              <span className="auth-error-icon">✅</span>
              {success}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="reg-fullname" className="auth-label">Nombre Completo</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🏷️</span>
              <input
                id="reg-fullname"
                type="text"
                name="fullName"
                className="auth-input"
                placeholder="Tu nombre completo"
                value={formData.fullName}
                onChange={handleChange}
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
                name="username"
                className="auth-input"
                placeholder="Elige un nombre de usuario"
                value={formData.username}
                onChange={handleChange}
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
                name="password"
                className="auth-input"
                placeholder="Mínimo 4 caracteres"
                value={formData.password}
                onChange={handleChange}
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
                name="confirmPassword"
                className="auth-input"
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading}
            icon={loading ? '⏳' : '📝'}
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-link">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
