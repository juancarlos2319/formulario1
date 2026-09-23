import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    redirectTo: 'dashboard'
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./components/registro/registro.component').then(
        (m) => m.RegistroComponent
      )
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      )
  },
  {
    path: 'contactos/:id',
    loadComponent: () =>
      import('./components/contactos/contactos.component').then(
        (m) => m.ContactosComponent
      )
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];