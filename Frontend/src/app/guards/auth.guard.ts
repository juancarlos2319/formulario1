import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Permite rutas protegidas con un JWT local vigente o redirige al login. */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = inject(AuthService).isLoggedIn();

  if (token) {
    return true;
  }

  return router.createUrlTree(['/inicio']);
};

/** Evita mostrar el login cuando ya existe una sesión local vigente. */
export const guestGuard: CanActivateFn = () =>
  inject(AuthService).isLoggedIn() ? inject(Router).createUrlTree(['/dashboard']) : true;
