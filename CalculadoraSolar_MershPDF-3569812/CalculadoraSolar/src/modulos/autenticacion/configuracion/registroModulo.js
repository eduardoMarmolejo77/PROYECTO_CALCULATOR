export const registroModulo = {
  id: 'autenticacion',
  nombre: 'Autenticación',
  version: '1.0.0',
  rutas: [
    {
      path: '/iniciar-sesion',
      componente: () => import('../paginas/PaginaInicioSesion.jsx'),
      requiereAuth: false,
    },
    {
      path: '/registro',
      componente: () => import('../paginas/PaginaRegistro.jsx'),
      requiereAuth: false,
    },
    {
      path: '/login',
      redireccion: '/iniciar-sesion',
    },
    {
      path: '/register',
      redireccion: '/registro',
    },
  ],
};
