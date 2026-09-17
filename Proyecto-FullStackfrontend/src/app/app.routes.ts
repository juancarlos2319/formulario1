import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'dashboard', 
    pathMatch: 'full' 
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) 
  },
  { 
    path: 'registro', 
    loadComponent: () => import('./registro/registro.component').then(m => m.RegistroComponent) 
  },
  { 
    path: 'registro/:id', 
    loadComponent: () => import('./registro/registro.component').then(m => m.RegistroComponent) 
  },
  { 
    path: 'contactos', 
    loadComponent: () => import('./contactos/contactos.component').then(m => m.ContactosComponent) 
  },
  { 
    path: '**', 
    redirectTo: 'dashboard' 
  }
];