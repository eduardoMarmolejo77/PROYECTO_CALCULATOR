import { lazy } from 'react';

/**
 * Registro central de módulos.
 *
 * Para QUITAR un módulo, simplemente comenta o elimina su entrada.
 * La sidebar y el router se actualizan automáticamente.
 *
 * Para AGREGAR un módulo, crea la carpeta en modules/ y añade la entrada aquí.
 */
export const modules = [
  {
    id: 'proposal',
    name: 'Nueva Propuesta',
    icon: '🚀',
    path: '/proposal',
    component: lazy(() => import('./proposal/ProposalPage')),
  },
  {
    id: 'history',
    name: 'Historial',
    icon: '📋',
    path: '/history',
    component: lazy(() => import('./history/HistoryPage')),
  },
];
