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
