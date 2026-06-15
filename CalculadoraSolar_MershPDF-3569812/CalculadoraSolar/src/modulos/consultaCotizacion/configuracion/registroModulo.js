export const registroModulo = {
  id: 'consulta-cotizacion',
  nombre: 'Consultar cotizacion',
  version: '1.0.0',
  rutas: [
    {
      path: '/consultar-cotizacion',
      componente: () => import('../paginas/PaginaConsultaCotizacion.jsx'),
      requiereAuth: true,
    },
  ],
  itemsNavegacion: [
    {
      etiqueta: 'Consultar cotizacion',
      ruta: '/consultar-cotizacion',
      icono: 'search',
      orden: 20,
    },
  ],
};
