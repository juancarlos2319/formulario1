import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PersonasService } from './personas.service';
import { PersonaResumen, Usuario } from '../interfaces/usuario.interface';

describe('PersonasService: consulta individual', () => {
    let service: PersonasService;
    let http: HttpTestingController;
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
        service = TestBed.inject(PersonasService);
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());
    const fila = (id: number): PersonaResumen => ({
        id, nombre: 'Persona', apellido: 'Prueba', correos: ['uno@example.com'], telefonos: ['5512345678'],
        ocupacion: 'Docente', direcciones: [{ municipio: 'Municipio' }], puedeEliminar: false
    });

    it('envia solo cambios y conserva los demas campos en ediciones sucesivas', () => {
        const url = 'http://localhost:8080/api/personas';
        const original = { ...fila(7), genero: 'Otro', fechaNacimiento: '1990-01-01', direcciones: [] } as Usuario;
        service.obtenerPersonas().subscribe();
        http.expectOne(url).flush([fila(7)]);
        service.obtenerPersonaPorId(7).subscribe();
        http.expectOne(`${url}/7`).flush(original);
        service.actualizarPersona(7, { ...original, nombre: 'Editada' }).subscribe();
        const primera = http.expectOne(`${url}/7`);
        expect(primera.request.method).toBe('PATCH');
        expect(primera.request.body).toEqual({ nombre: 'Editada' });
        primera.flush({ ok: true, persona: { nombre: 'Editada' } });
        service.actualizarPersona(7, { ...original, nombre: 'Editada', ocupacion: 'Otra' }).subscribe();
        const segunda = http.expectOne(`${url}/7`);
        expect(segunda.request.body).toEqual({ ocupacion: 'Otra' });
        segunda.flush({ ok: true, persona: { ocupacion: 'Otra' } });
        service.obtenerPersonas().subscribe(filas => {
            expect(filas[0].nombre).toBe('Editada');
            expect(filas[0].ocupacion).toBe('Otra');
            expect(filas[0].correos).toEqual(original.correos);
        });
        http.expectNone(url);
        service.actualizarPersona(7, { ...original, nombre: 'Editada', ocupacion: 'Otra' }).subscribe();
        http.expectNone(`${url}/7`);
    });

    it('reemplaza solo la fila editada sin descargar el listado ni los detalles de otras personas', () => {
        const url = 'http://localhost:8080/api/personas';
        const otra = fila(8);
        service.obtenerPersonas().subscribe();
        http.expectOne(url).flush([fila(7), otra]);
        service.obtenerPersonasInactivas().subscribe();
        http.expectOne(`${url}/inactivos`).flush([fila(9)]);
        for (const id of [7, 8]) {
            service.obtenerDetallePersona(id).subscribe();
            http.expectOne(`${url}/${id}/detalles`).flush({ genero: 'Otro', fechaNacimiento: '1990-01-01', direcciones: [] });
        }
        const actualizada = { ...fila(7), nombre: 'Editada', correos: ['persistido@example.com'] };
        service.actualizarPersona(7, { ...actualizada, genero: 'Otro', fechaNacimiento: '1990-01-01', direcciones: [] } as Usuario).subscribe();
        http.expectOne(`${url}/7`).flush({ ok: true, persona: actualizada });
        service.obtenerPersonas().subscribe(filas => {
            expect(filas.length).toBe(2);
            expect(filas[0]).toEqual(actualizada);
            expect(filas[1]).toEqual(otra);
            expect(filas[0].puedeEliminar).toBe(false);
        });
        service.obtenerPersonasInactivas().subscribe(filas => expect(filas[0].id).toBe(9));
        service.obtenerDetallePersona(8).subscribe(datos => expect(datos.genero).toBe('Otro'));
        http.expectNone(url);
        http.expectNone(`${url}/inactivos`);
        http.expectNone(`${url}/8/detalles`);
        service.obtenerDetallePersona(7).subscribe();
        http.expectNone(`${url}/7/detalles`);
    });

    it('aplica la fila editada aunque el listado inicial termine despues del guardado', () => {
        const url = 'http://localhost:8080/api/personas';
        service.obtenerPersonas().subscribe();
        const pendiente = http.expectOne(url);
        service.actualizarPersona(7, fila(7) as Usuario).subscribe();
        const actualizada = { ...fila(7), nombre: 'Actualizada' };
        http.expectOne(`${url}/7`).flush({ ok: true, persona: actualizada });
        service.obtenerPersonas().subscribe(filas => expect(filas[0].nombre).toBe('Actualizada'));
        pendiente.flush([fila(7)]);
        http.expectNone(url);
    });

    it('conserva las ediciones sucesivas de distintas filas sin consultar de nuevo la lista', () => {
        const url = 'http://localhost:8080/api/personas';
        service.obtenerPersonas().subscribe();
        http.expectOne(url).flush([fila(7), fila(8)]);
        for (const id of [7, 8, 7]) {
            service.actualizarPersona(id, fila(id) as Usuario).subscribe();
            http.expectOne(`${url}/${id}`).flush({ ok: true, persona: { ...fila(id), nombre: `Editada ${id}` } });
        }
        service.obtenerPersonas().subscribe(filas => expect(filas.map(fila => fila.nombre)).toEqual(['Editada 7', 'Editada 8']));
        http.expectNone(url);
    });

    it('no reemplaza el listado cuando el guardado falla ni conserva cambios de una sesion anterior', () => {
        vi.spyOn(console, 'error').mockReturnValue(undefined);
        const url = 'http://localhost:8080/api/personas';
        service.obtenerPersonas().subscribe();
        http.expectOne(url).flush([fila(7)]);
        service.actualizarPersona(7, fila(7) as Usuario).subscribe({ error: () => { } });
        http.expectOne(`${url}/7`).flush('Error', { status: 400, statusText: 'Error' });
        service.obtenerPersonas().subscribe(filas => expect(filas[0].nombre).toBe('Persona'));
        http.expectNone(url);
        service.actualizarPersona(7, fila(7) as Usuario).subscribe();
        const anterior = http.expectOne(`${url}/7`);
        service.limpiarCacheSesion();
        service.obtenerPersonas().subscribe();
        http.expectOne(url).flush([fila(7)]);
        anterior.flush({ ok: true, persona: { ...fila(7), nombre: 'Sesion anterior' } });
        service.obtenerPersonas().subscribe(filas => expect(filas[0].nombre).toBe('Persona'));
        http.expectNone(url);
    });

    it('conserva listas y detalles y comparte solicitudes simultaneas', () => {
        const url = 'http://localhost:8080/api/personas';
        service.obtenerPersonas().subscribe();
        http.expectOne(url).flush([]);
        service.obtenerPersonas().subscribe(datos => expect(datos).toEqual([]));
        http.expectNone(url);
        service.obtenerDetallePersona(7).subscribe();
        service.obtenerDetallePersona(7).subscribe();
        http.expectOne(`${url}/7/detalles`).flush({ genero: 'Otro', fechaNacimiento: '1990-01-01', direcciones: [] });
        service.obtenerDetallePersona(7).subscribe(datos => expect(datos.genero).toBe('Otro'));
        http.expectNone(`${url}/7/detalles`);
        http.expectNone(`${url}/7`);
    });

    it('invalida listas y detalles al actualizar y al cambiar de sesion', () => {
        const url = 'http://localhost:8080/api/personas';
        service.obtenerPersonas().subscribe();
        http.expectOne(url).flush([]);
        service.obtenerDetallePersona(8).subscribe();
        http.expectOne(`${url}/8/detalles`).flush({ direcciones: [] });
        service.guardarContactos(7, []).subscribe();
        http.expectOne(`${url}/7/contactos`).flush({ ok: true });
        service.obtenerPersonas().subscribe();
        http.expectOne(url).flush([]);
        service.obtenerDetallePersona(8).subscribe();
        http.expectOne(`${url}/8/detalles`).flush({ direcciones: [] });
        service.limpiarCacheSesion();
        service.obtenerDetallePersona(8).subscribe();
        http.expectOne(`${url}/8/detalles`).flush({ direcciones: [] });
        expect(service).toBeDefined();
    });

    it('permite reintentar un detalle fallido y conserva cache tras guardado fallido', () => {
        vi.spyOn(console, 'error').mockReturnValue(undefined);
        const url = 'http://localhost:8080/api/personas/7/detalles';
        service.obtenerDetallePersona(7).subscribe({ error: error => expect(error).toBeInstanceOf(Error) });
        http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
        service.obtenerDetallePersona(7).subscribe();
        http.expectOne(url).flush({ genero: 'Otro', direcciones: [] });
        service.guardarContactos(7, []).subscribe({ error: error => expect(error).toBeInstanceOf(Error) });
        http.expectOne('http://localhost:8080/api/personas/7/contactos').flush({}, { status: 400, statusText: 'Error' });
        service.obtenerDetallePersona(7).subscribe(datos => expect(datos.genero).toBe('Otro'));
        http.expectNone(url);
    });

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
        expect(req.request.method).toBe('PATCH');
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
        vi.spyOn(console, 'error').mockReturnValue(undefined);
        service.obtenerPersonaPorId(99).subscribe({ next: () => expect.fail('Se esperaba error'), error: error => expect(error).toBeInstanceOf(Error) });
        http.expectOne('http://localhost:8080/api/personas/99').flush({}, { status: 404, statusText: 'Not Found' });
        http.expectNone('http://localhost:8080/api/personas');
    });
});
