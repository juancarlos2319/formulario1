import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PersonasService } from './personas.service';

describe('PersonasService: consulta individual', () => {
  let service: PersonasService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PersonasService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('reutiliza contactos durante la navegación y limpia las cachés al cambiar de sesión', () => {
    service.obtenerContactos(7).subscribe();
    http.expectOne('http://localhost:8080/api/personas/7/contactos').flush([{ idContacto: 3 }]);
    service.obtenerParentescos().subscribe();
    http.expectOne('http://localhost:8080/api/parentescos').flush([{ id: 9, nombre: 'Amigo' }]);
    service.obtenerContactos(7).subscribe(contactos => expect(contactos[0].idContacto).toBe(3));
    http.expectNone('http://localhost:8080/api/personas/7/contactos');
    service.limpiarCacheSesion();
    service.obtenerContactos(7).subscribe();
    http.expectOne('http://localhost:8080/api/personas/7/contactos').flush([]);
    service.obtenerParentescos().subscribe();
    http.expectOne('http://localhost:8080/api/parentescos').flush([]);
  });

  it('invalida otros titulares al editar los datos de un contacto compartido', () => {
    service.obtenerContactos(8).subscribe();
    http.expectOne('http://localhost:8080/api/personas/8/contactos').flush([{ idContacto: 3 }]);
    service.guardarContactos(7, [{ idContacto: 3, nombre: 'Nuevo' }]).subscribe();
    http.expectOne('http://localhost:8080/api/personas/7/contactos').flush({ ok: true });
    service.obtenerContactos(8).subscribe();
    http.expectOne('http://localhost:8080/api/personas/8/contactos').flush([{ idContacto: 3, nombre: 'Nuevo' }]);
  });
  it('comparte peticiones simultaneas sin conservar datos despues', () => {
    service.obtenerPersonaPorId(7).subscribe();
    service.obtenerPersonaPorId(7).subscribe();
    http.expectOne('http://localhost:8080/api/personas/7').flush({ id: 7 });
    service.obtenerPersonaPorId(7).subscribe();
    http.expectOne('http://localhost:8080/api/personas/7').flush({ id: 7 });
  });

  it('envia arrays y recibe solo confirmacion al editar', () => {
    const datos = { nombre: 'Prueba', correos: ['uno@example.com'], telefonos: ['5512345678'] } as import('../interfaces/usuario.interface').Usuario;
    service.actualizarPersona(7, datos).subscribe(resultado => expect(resultado).toEqual({ ok: true }));
    const req = http.expectOne('http://localhost:8080/api/personas/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(datos);
    req.flush({ ok: true });
  });
  it('consulta solo el ID y no descarga la lista', () => {
    service.obtenerPersonaPorId(7).subscribe(persona => expect(persona.id).toBe(7));
    const req = http.expectOne('http://localhost:8080/api/personas/7');
    expect(req.request.method).toBe('GET');
    http.expectNone('http://localhost:8080/api/personas');
    req.flush({ id: 7, nombre: 'Prueba' });
  });
  it('propaga el error sin recurrir a consultar todos', () => {
    spyOn(console, 'error');
    service.obtenerPersonaPorId(99).subscribe({ next: () => fail('Se esperaba error'), error: error => expect(error).toBeInstanceOf(Error) });
    http.expectOne('http://localhost:8080/api/personas/99').flush({}, { status: 404, statusText: 'Not Found' });
    http.expectNone('http://localhost:8080/api/personas');
  });
});
