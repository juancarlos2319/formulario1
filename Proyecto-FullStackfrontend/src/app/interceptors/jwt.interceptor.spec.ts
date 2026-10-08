import { TestBed, fakeAsync, tick } from '@angular/core/testing';
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
    auth.logout.and.callFake(() => localStorage.removeItem('jwt_token'));
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
  for (const status of [400, 401, 403, 404, 409, 422, 500, 502, 503, 504]) {
    it(`propaga ${status} y cierra sesión para 401 o fallo de servidor`, () => {
      TestBed.inject(HttpClient).put('http://localhost:8080/api/auth/me/login', {}).subscribe({
        error: error => expect(error.status).toBe(status)
      });
      const peticion = http.expectOne('http://localhost:8080/api/auth/me/login');
      peticion.flush({}, { status, statusText: 'Error de prueba' });
      expect(auth.logout.calls.count()).toBe(status === 401 || status >= 500 ? 1 : 0);
    });
  }
  it('cierra sesion y redirige al login cuando el backend no esta disponible', () => {
    TestBed.inject(HttpClient).get('http://localhost:8080/api/personas').subscribe({
      error: error => expect(error.status).toBe(0)
    });
    http.expectOne('http://localhost:8080/api/personas').error(new ProgressEvent('error'));
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/inicio'], { replaceUrl: true });
  });

  it('limita la espera del backend a quince segundos', fakeAsync(() => {
    TestBed.inject(HttpClient).get('http://localhost:8080/api/personas').subscribe({
      error: error => expect(error.status).toBe(0)
    });
    const peticion = http.expectOne('http://localhost:8080/api/personas');
    tick(14_999);
    expect(auth.logout).not.toHaveBeenCalled();
    tick(1);
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(peticion.cancelled).toBeTrue();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/inicio'], { replaceUrl: true });
  }));

  it('no cierra una sesion nueva por el fallo de una peticion antigua', () => {
    TestBed.inject(HttpClient).get('http://localhost:8080/api/personas').subscribe({ error: () => {} });
    localStorage.setItem('jwt_token', 'otra-sesion');
    http.expectOne('http://localhost:8080/api/personas').flush({}, { status: 503, statusText: 'Error' });
    expect(auth.logout).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('redirige una sola vez ante fallos simultaneos', () => {
    const cliente = TestBed.inject(HttpClient);
    cliente.get('http://localhost:8080/api/personas').subscribe({ error: () => {} });
    cliente.get('http://localhost:8080/api/ocupaciones').subscribe({ error: () => {} });
    http.expectOne('http://localhost:8080/api/personas').error(new ProgressEvent('error'));
    http.expectOne('http://localhost:8080/api/ocupaciones').error(new ProgressEvent('error'));
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledTimes(1);
  });

  it('no cierra sesion por fallos de un servicio externo', () => {
    TestBed.inject(HttpClient).get('https://www.correosmexico.com.mx/api/cp').subscribe({ error: () => {} });
    const peticion = http.expectOne('https://www.correosmexico.com.mx/api/cp');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.error(new ProgressEvent('error'));
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('propaga el fallo del login sin una sesion abierta', () => {
    localStorage.removeItem('jwt_token');
    TestBed.inject(HttpClient).post('http://localhost:8080/api/auth/login', {}).subscribe({
      error: error => expect(error.status).toBe(503)
    });
    http.expectOne('http://localhost:8080/api/auth/login').flush({}, { status: 503, statusText: 'Error' });
    expect(auth.logout).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

});
