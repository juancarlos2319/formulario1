import { TestBed, fakeAsync, discardPeriodicTasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { PersonasService } from './personas.service';

describe('AuthService: datos de la cuenta en sesión', () => {
  const cuenta = { nombre: 'Cuenta Uno', correo: 'uno@example.com' };
  const token = () => `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.firma`;
  beforeEach(() => {
    localStorage.removeItem('jwt_token');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });

  it('actualiza el header después de guardar personas o contactos y no consulta si falla el guardado', fakeAsync(() => {
    const auth = TestBed.inject(AuthService);
    const personas = TestBed.inject(PersonasService);
    const http = TestBed.inject(HttpTestingController);
    auth.login({ username: 'uno', password: 'prueba' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush({ token: token(), usuarioActual: cuenta });
    personas.actualizarPersona(1, { nombre: 'Nuevo nombre' } as import('../interfaces/usuario.interface').Usuario).subscribe();
    http.expectOne('http://localhost:8080/api/personas/1').flush({ ok: true });
    const nueva = { nombre: 'Nuevo nombre', correo: 'nuevo@example.com' };
    http.expectOne('http://localhost:8080/api/auth/me').flush(nueva);
    expect(auth.usuarioActual()).toEqual(nueva);
    auth.obtenerUsuarioActual().subscribe();
    http.expectNone('http://localhost:8080/api/auth/me');
    personas.guardarContactos(2, [{ idContacto: 1, correos: ['otro@example.com'] }]).subscribe();
    http.expectOne('http://localhost:8080/api/personas/2/contactos').flush({ ok: true });
    http.expectOne('http://localhost:8080/api/auth/me').flush({ ...nueva, correo: 'otro@example.com' });
    expect(auth.usuarioActual()?.correo).toBe('otro@example.com');
    spyOn(console, 'error');
    personas.guardarContactos(2, []).subscribe({ error: () => {} });
    http.expectOne('http://localhost:8080/api/personas/2/contactos').flush('Error', { status: 400, statusText: 'Bad Request' });
    http.expectNone('http://localhost:8080/api/auth/me');
    http.verify();
    auth.logout();
    discardPeriodicTasks();
  }));

  it('ignora consultas anteriores cuando hay dos actualizaciones consecutivas', fakeAsync(() => {
    localStorage.setItem('jwt_token', token());
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.actualizarUsuarioActual().subscribe();
    const anterior = http.expectOne('http://localhost:8080/api/auth/me');
    auth.actualizarUsuarioActual().subscribe();
    http.expectOne('http://localhost:8080/api/auth/me').flush(cuenta);
    anterior.flush({ nombre: 'Anterior', correo: 'anterior@example.com' });
    expect(auth.usuarioActual()).toEqual(cuenta);
    http.verify();
    auth.logout();
    discardPeriodicTasks();
  }));

  it('usa el nombre y correo del login sin consultar de nuevo al navegar y limpia al salir', fakeAsync(() => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.login({ username: 'uno', password: 'prueba' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush({ token: token(), usuarioActual: cuenta });
    expect(auth.usuarioActual()).toEqual(cuenta);
    auth.obtenerUsuarioActual().subscribe(usuario => expect(usuario).toEqual(cuenta));
    auth.obtenerUsuarioActual().subscribe(usuario => expect(usuario).toEqual(cuenta));
    http.expectNone('http://localhost:8080/api/auth/me');
    auth.logout();
    expect(auth.usuarioActual()).toBeNull();
    auth.login({ username: 'dos', password: 'prueba' }).subscribe();
    const otra = { nombre: 'Cuenta Dos', correo: 'dos@example.com' };
    http.expectOne('http://localhost:8080/api/auth/login').flush({ token: token(), usuarioActual: otra });
    expect(auth.usuarioActual()).toEqual(otra);
    http.verify();
    auth.logout();
    discardPeriodicTasks();
  }));

  it('recupera una sesión previa con una sola petición compartida', fakeAsync(() => {
    localStorage.setItem('jwt_token', token());
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.obtenerUsuarioActual().subscribe();
    auth.obtenerUsuarioActual().subscribe();
    http.expectOne('http://localhost:8080/api/auth/me').flush(cuenta);
    auth.obtenerUsuarioActual().subscribe();
    http.expectNone('http://localhost:8080/api/auth/me');
    expect(auth.usuarioActual()).toEqual(cuenta);
    http.verify();
    auth.logout();
    discardPeriodicTasks();
  }));

  it('no conserva datos de una respuesta que llega después de cerrar sesión', fakeAsync(() => {
    localStorage.setItem('jwt_token', token());
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.obtenerUsuarioActual().subscribe();
    const request = http.expectOne('http://localhost:8080/api/auth/me');
    auth.logout();
    request.flush(cuenta);
    expect(auth.usuarioActual()).toBeNull();
    http.verify();
    discardPeriodicTasks();
  }));
});
