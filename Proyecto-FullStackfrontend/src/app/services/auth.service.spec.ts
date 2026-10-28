import { TestBed, fakeAsync, discardPeriodicTasks } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { PersonasService } from './personas.service';

describe('AuthService: datos de la cuenta en sesión', () => {
  const cuenta = { idPersona: 1, nombre: 'Cuenta Uno', correo: 'uno@example.com' };
  const token = () => `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.firma`;
  beforeEach(() => {
    localStorage.removeItem('jwt_token');
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
  });

  it('actualiza el header propio desde la fila guardada sin consultar auth/me', fakeAsync(() => {
    const auth = TestBed.inject(AuthService);
    const personas = TestBed.inject(PersonasService);
    const http = TestBed.inject(HttpTestingController);
    auth.login({ username: 'uno', password: 'prueba' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush({ token: token(), usuarioActual: cuenta });
    const fila = { id: 1, fechaNacimiento: '1990-01-01', genero: 'Otro', nombre: 'Cuenta', apellido: 'Actualizada', correos: ['nuevo@example.com'], telefonos: [], ocupacion: 'Docente' };
    personas.actualizarPersona(1, fila as import('../interfaces/usuario.interface').Usuario).subscribe();
    http.expectOne('http://localhost:8080/api/personas/1').flush({ ok: true, persona: fila });
    expect(auth.usuarioActual()).toEqual({ idPersona: 1, nombre: 'Cuenta Actualizada', correo: 'nuevo@example.com' });
    http.expectNone('http://localhost:8080/api/auth/me');
    auth.obtenerUsuarioActual().subscribe(cuenta => expect(cuenta.correo).toBe('nuevo@example.com'));
    http.expectNone('http://localhost:8080/api/auth/me');
    auth.logout(); discardPeriodicTasks();
  }));

  it('no refresca el perfil por otra persona ni por cambios propios ajenos al nombre o correo principal', fakeAsync(() => {
    const auth = TestBed.inject(AuthService);
    const personas = TestBed.inject(PersonasService);
    const http = TestBed.inject(HttpTestingController);
    auth.login({ username: 'uno', password: 'prueba' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush({ token: token(), usuarioActual: cuenta });
    const original = auth.usuarioActual();
    for (const id of [2, 1]) {
      const fila = { id, nombre: 'Cuenta', apellido: 'Uno', correos: ['uno@example.com', 'secundario@example.com'], telefonos: ['5512345678'], ocupacion: 'Nueva' };
      personas.actualizarPersona(id, fila as import('../interfaces/usuario.interface').Usuario).subscribe();
      http.expectOne('http://localhost:8080/api/personas/' + id).flush({ ok: true, persona: fila });
      expect(auth.usuarioActual()).toBe(original);
      http.expectNone('http://localhost:8080/api/auth/me');
    }
    personas.guardarContactos(2, [{ idContacto: 3, nombre: 'Otra', apellido: 'Persona', correos: ['otra@example.com'] }]).subscribe();
    http.expectOne('http://localhost:8080/api/personas/2/contactos').flush({ ok: true });
    http.expectNone('http://localhost:8080/api/auth/me');
    expect(auth.usuarioActual()).toBe(original);
    auth.logout(); discardPeriodicTasks();
  }));

  it('consulta el perfil solo si se editaron nombre o correo de la cuenta como contacto compartido', fakeAsync(() => {
    const auth = TestBed.inject(AuthService);
    const personas = TestBed.inject(PersonasService);
    const http = TestBed.inject(HttpTestingController);
    auth.login({ username: 'uno', password: 'prueba' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush({ token: token(), usuarioActual: cuenta });
    personas.guardarContactos(2, [{ idContacto: 1, nombre: 'Cuenta', apellido: 'Uno', correos: ['nuevo@example.com'] }]).subscribe();
    http.expectOne('http://localhost:8080/api/personas/2/contactos').flush({ ok: true });
    http.expectOne('http://localhost:8080/api/auth/me').flush({ ...cuenta, correo: 'nuevo@example.com' });
    expect(auth.usuarioActual()?.correo).toBe('nuevo@example.com');
    const original = auth.usuarioActual();
    personas.guardarContactos(2, [{ idContacto: 1, idParentesco: 9 }]).subscribe();
    http.expectOne('http://localhost:8080/api/personas/2/contactos').flush({ ok: true });
    http.expectNone('http://localhost:8080/api/auth/me');
    expect(auth.usuarioActual()).toBe(original);
    spyOn(console, 'error');
    personas.actualizarPersona(1, { nombre: 'No guardado' } as import('../interfaces/usuario.interface').Usuario).subscribe({ error: () => {} });
    http.expectOne('http://localhost:8080/api/personas/1').flush('Error', { status: 400, statusText: 'Error' });
    expect(auth.usuarioActual()).toBe(original);
    http.expectNone('http://localhost:8080/api/auth/me');
    auth.logout(); discardPeriodicTasks();
  }));

  it('no sobrescribe el perfil guardado con una consulta anterior todavia pendiente', fakeAsync(() => {
    const auth = TestBed.inject(AuthService);
    const personas = TestBed.inject(PersonasService);
    const http = TestBed.inject(HttpTestingController);
    auth.login({ username: 'uno', password: 'prueba' }).subscribe();
    http.expectOne('http://localhost:8080/api/auth/login').flush({ token: token(), usuarioActual: cuenta });
    auth.actualizarUsuarioActual().subscribe();
    const anterior = http.expectOne('http://localhost:8080/api/auth/me');
    const fila = { id: 1, nombre: 'Cuenta', apellido: 'Nueva', correos: ['nuevo@example.com'], telefonos: ['5512345678'], ocupacion: 'Docente' };
    personas.actualizarPersona(1, { ...fila, genero: 'Otro', fechaNacimiento: '1990-01-01' }).subscribe();
    http.expectOne('http://localhost:8080/api/personas/1').flush({ ok: true, persona: fila });
    anterior.flush(cuenta);
    expect(auth.usuarioActual()).toEqual({ idPersona: 1, nombre: 'Cuenta Nueva', correo: 'nuevo@example.com' });
    http.expectNone('http://localhost:8080/api/auth/me');
    auth.logout(); discardPeriodicTasks();
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
    const otra = { idPersona: 2, nombre: 'Cuenta Dos', correo: 'dos@example.com' };
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
