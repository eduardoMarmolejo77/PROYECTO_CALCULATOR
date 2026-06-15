export const registroModulo = {
  id: 'pdf',
  nombre: 'PDF',
  version: '1.0.0',
  rutas: [
    {
      path: '/mersh-pdf',
      componente: () => import('../paginas/PaginaMershPdf.jsx'),
      requiereAuth: true,
    },
  ],
  itemsNavegacion: [
    {
      etiqueta: 'Solo Mersh PDF',
      ruta: '/mersh-pdf',
      icono: 'pdf',
      orden: 30,
    },
  ],
};
