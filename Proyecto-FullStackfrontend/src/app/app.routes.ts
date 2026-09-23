import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { InicioComponent } from './components/inicio/inicio.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { RegistroComponent } from './components/registro/registro.component';
import { ContactosComponent } from './components/contactos/contactos.component';

import { PersonasComponent } from './components/personas/personas.component';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'personas', component: PersonasComponent, canActivate: [authGuard] },
  { path: 'registro', component: RegistroComponent, canActivate: [authGuard] },
  { path: 'registro/:id', component: RegistroComponent, canActivate: [authGuard] },
  { path: 'contactos', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'contactos/:id', component: ContactosComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'inicio' }
];
