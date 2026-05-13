import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import { modules } from './modules';

/**
 * App principal — Router + AuthProvider.
 * Los módulos se cargan dinámicamente desde modules/index.js.
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

            {/* Rutas protegidas */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Rutas dinámicas de módulos */}
              {modules.map((mod) => {
                const ModComponent = mod.component;
                return (
                  <Route
                    key={mod.id}
                    path={mod.path}
                    element={<ModComponent />}
                  />
                );
              })}

              {/* Redirect root to first module */}
              {modules.length > 0 && (
                <Route
                  path="/"
                  element={<Navigate to={modules[0].path} replace />}
                />
              )}
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
