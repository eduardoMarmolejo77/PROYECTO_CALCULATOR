import { Link } from 'react-router-dom';
import Boton from '../../../compartido/componentes/Boton';
import '../../autenticacion/estilos/autenticacion.css';

export default function PaginaNoEncontrada() {
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
          <Link to="/propuesta">
            <Boton variant="primary" fullWidth icon="🏠">
              Volver al inicio
            </Boton>
          </Link>
        </div>
      </div>
    </div>
  );
}
