import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = localStorage.getItem('jwt_token');

  if (token && req.url.startsWith('http://localhost:8080/api/')) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned).pipe(catchError(error => {
      if (error.status === 401 || error.status === 403) {
        authService.logout();
        router.navigate(['/inicio'], { replaceUrl: true });
      }
      return throwError(() => error);
    }));
  }

  return next(req);
};
