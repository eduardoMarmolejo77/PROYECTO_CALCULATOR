import { Navigate } from 'react-router-dom';
import { useAutenticacion } from './usarAutenticacion';

export default function RutaProtegida({ children }) {
  const { autenticado, cargando } = useAutenticacion();

  if (cargando) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  return children;
}
