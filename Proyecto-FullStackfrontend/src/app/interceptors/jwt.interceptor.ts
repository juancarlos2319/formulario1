import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('http://localhost:8080/api/')) return next(req);

  const router = inject(Router);
  const authService = inject(AuthService);
  const token = localStorage.getItem('jwt_token');
  const solicitud = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(solicitud).pipe(
    timeout({ each: 15_000 }),
    catchError(error => {
      const fallo = error instanceof TimeoutError
        ? new HttpErrorResponse({ status: 0, statusText: 'Backend sin respuesta', url: req.url })
        : error;
      const falloSesion = fallo.status === 401 || fallo.status === 0 || (fallo.status >= 500 && fallo.status <= 599);
      // Una respuesta antigua no debe cerrar una sesion iniciada posteriormente.
      if (falloSesion && token && localStorage.getItem('jwt_token') === token) {
        authService.logout();
        router.navigate(['/inicio'], { replaceUrl: true });
      }
      return throwError(() => fallo);
    })
  );
};
