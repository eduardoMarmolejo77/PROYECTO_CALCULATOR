import { useAuth } from '../../hooks/useAuth';
import './layout.css';

/**
 * Barra superior con info del usuario y botón de logout.
 */
export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__left">
        <h2 className="navbar__greeting">
          Hola, <span className="navbar__username">{user?.fullName || 'Usuario'}</span>
        </h2>
      </div>

      <div className="navbar__right">
        <div className="navbar__user-badge">
          <span className="navbar__avatar">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </span>
          <span className="navbar__user-name">{user?.username}</span>
        </div>
        <button className="navbar__logout" onClick={logout} title="Cerrar sesión">
          🚪 Salir
        </button>
      </div>
    </header>
  );
}
