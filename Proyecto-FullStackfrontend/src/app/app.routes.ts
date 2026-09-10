import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { RegistroComponent } from './registro/registro.component';
import { ContactosComponent } from './contactos/contactos.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'contactos', component: ContactosComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: '**', redirectTo: 'inicio' }
];