import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { InicioComponent } from './components/inicio/inicio.component';
import { AdminLayoutComponent } from './components/shared/admin-layout/admin-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PersonasComponent } from './components/personas/personas.component';
import { RegistroComponent } from './components/registro/registro.component';
import { ContactosComponent } from './components/contactos/contactos.component';

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
