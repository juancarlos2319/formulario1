import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { InicioComponent } from './components/inicio/inicio.component';
import { AdminLayoutComponent } from './components/shared/admin-layout/admin-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PersonasComponent } from './components/personas/personas.component';
import { RegistroComponent } from './components/registro/registro.component';
import { ContactosComponent } from './components/contactos/contactos.component';
import { ContactosListaComponent } from './components/contactos-lista/contactos-lista.component';
import { PersonasDesactivadasComponent } from './components/personas-desactivadas/personas-desactivadas.component';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, data: { titulo: 'Resumen' } },
      { path: 'personas/desactivadas', component: PersonasDesactivadasComponent, data: { titulo: 'Personas desactivadas' } },
      { path: 'personas', component: PersonasComponent, data: { titulo: 'Personas' } },
      { path: 'registro', component: RegistroComponent, data: { titulo: 'Registro' } },
      { path: 'registro/:id', component: RegistroComponent, data: { titulo: 'Editar persona' } },
      { path: 'contactos', component: ContactosComponent, data: { titulo: 'Contactos de emergencia' } },
      { path: 'contactos/:id/editar/:contactoId', component: ContactosComponent, data: { titulo: 'Editar contacto', modoContactos: 'editar' } },
      { path: 'contactos/:id/agregar', component: ContactosComponent, data: { titulo: 'Agregar contacto', modoContactos: 'agregar' } },
      { path: 'contactos/:id', component: ContactosListaComponent, data: { titulo: 'Contactos de emergencia' } }
    ]
  },
    { path: '**', redirectTo: 'inicio' }
];
