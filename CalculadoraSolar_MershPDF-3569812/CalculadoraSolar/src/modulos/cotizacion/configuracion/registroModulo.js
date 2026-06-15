export const registroModulo = {
  id: 'cotizacion',
  nombre: 'Cotización',
  version: '1.0.0',
  dependenciasOpcionales: ['pdf', 'ia', 'catalogo'],
  rutas: [
    {
      path: '/',
      redireccion: '/propuesta',
    },
    {
      path: '/propuesta',
      componente: () => import('../paginas/PaginaCotizacion.jsx'),
      requiereAuth: true,
    },
    {
      path: '/cotizar-sin-calculadora',
      componente: () => import('../paginas/PaginaCotizacion.jsx'),
      requiereAuth: true,
    },
    {
      path: '/proposal',
      redireccion: '/propuesta',
    },
  ],
  itemsNavegacion: [
    {
      etiqueta: 'Calculadora Solar',
      ruta: '/propuesta',
      icono: 'calculate',
      orden: 10,
    },
    {
      etiqueta: 'Cotizar sin calculadora',
      ruta: '/cotizar-sin-calculadora',
      icono: 'request_quote',
      orden: 15,
    },
  ],
};
