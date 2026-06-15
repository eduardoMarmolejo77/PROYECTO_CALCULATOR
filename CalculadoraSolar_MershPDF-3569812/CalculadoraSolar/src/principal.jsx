import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/global.css';
import './core/estilos/base.css';
import Aplicacion from './aplicacion/Aplicacion.jsx';
import { registrarModulosBase } from './modulos/registrarModulos';

registrarModulosBase();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Aplicacion />
  </StrictMode>
);
