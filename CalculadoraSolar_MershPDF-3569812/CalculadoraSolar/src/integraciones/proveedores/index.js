import { obtenerConfiguracionApi } from '../http/configuracionApi';
import { interfuerzaAdapter } from './interfuerza/adapter';

const adapters = {
  interfuerza: interfuerzaAdapter,
};

export function obtenerAdapter() {
  const proveedor = obtenerConfiguracionApi().provider;
  const adapter = adapters[proveedor];

  if (!adapter) {
    throw new Error(`Proveedor "${proveedor}" no tiene adapter implementado.`);
  }

  return adapter;
}
