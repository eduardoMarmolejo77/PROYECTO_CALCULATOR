import { contenedor } from '../core/contenedor/contenedorModulos';
import autenticacion from './autenticacion';
import catalogo from './catalogo';
import consultaCotizacion from './consultaCotizacion';
import cotizacion from './cotizacion';
import pdf from './pdf';

export function registrarModulosBase() {
  contenedor
    .limpiar()
    .registrar(autenticacion)
    .registrar(catalogo)
    .registrar(cotizacion)
    .registrar(consultaCotizacion)
    .registrar(pdf);

  return contenedor;
}
