import { useContext } from 'react';
import { ContextoAutenticacion } from './contextoAutenticacion';

export function useAutenticacion() {
  const contexto = useContext(ContextoAutenticacion);
  if (!contexto) {
    throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  }
  return contexto;
}

export const usarAutenticacion = useAutenticacion;
