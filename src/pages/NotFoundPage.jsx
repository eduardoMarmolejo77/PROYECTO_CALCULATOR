import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import '../components/auth/auth.css';

export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="bg-pattern" />
      <div className="auth-container animate-fade-in-up" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <div className="auth-logo">🔍</div>
          <h1 className="auth-title">404</h1>
          <p className="auth-subtitle">Página no encontrada</p>
        </div>
        <div style={{ padding: '0 32px 48px' }}>
          <Link to="/proposal">
            <Button variant="primary" fullWidth icon="🏠">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
