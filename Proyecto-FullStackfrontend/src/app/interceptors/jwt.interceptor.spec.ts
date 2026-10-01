import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor: errores de autorización', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let http: HttpTestingController;
  let tokenAnterior: string | null;
  beforeEach(() => {
    tokenAnterior = localStorage.getItem('jwt_token');
    localStorage.setItem('jwt_token', 'token-ficticio-prueba');
    auth = jasmine.createSpyObj('AuthService', ['logout']);
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: auth }
    ] });
    http = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  });
  afterEach(() => {
    http.verify();
    if (tokenAnterior === null) localStorage.removeItem('jwt_token');
    else localStorage.setItem('jwt_token', tokenAnterior);
  });
  for (const status of [401, 403]) {
    it(`propaga ${status} y solo cierra sesión para 401`, () => {
      TestBed.inject(HttpClient).put('http://localhost:8080/api/auth/me/login', {}).subscribe({
        error: error => expect(error.status).toBe(status)
      });
      const peticion = http.expectOne('http://localhost:8080/api/auth/me/login');
      peticion.flush({}, { status, statusText: 'Error de prueba' });
      expect(auth.logout.calls.count()).toBe(status === 401 ? 1 : 0);
    });
  }
});
