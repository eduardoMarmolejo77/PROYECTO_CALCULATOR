import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import ProposalPage from './modules/proposal/ProposalPage';

/**
 * App principal — Router + AuthProvider.
 * Acceso directo a ProposalPage sin sidebar.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="loading-screen">
              <div className="loading-spinner" />
              <p>Cargando módulo...</p>
            </div>
          }
        >
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Ruta protegida - Propuestas sin sidebar */}
            <Route
              path="/proposal"
              element={
                <ProtectedRoute>
                  <ProposalPage />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to proposal */}
            <Route
              path="/"
              element={<Navigate to="/proposal" replace />}
            />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
