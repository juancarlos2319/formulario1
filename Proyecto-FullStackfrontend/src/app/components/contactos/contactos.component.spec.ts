import type { Mock } from 'vitest';
import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ContactosComponent } from './contactos.component';
import { PersonasService } from '../../services/personas.service';
import { FeedbackService } from '../shared/feedback/feedback.service';
import { ContactoEmergencia } from '../../interfaces/contacto-emergencia.interface';
import { Usuario } from '../../interfaces/usuario.interface';

describe('ContactosComponent', () => {
    let component: ContactosComponent;
    let servicio: { obtenerContactos: Mock<PersonasService['obtenerContactos']>; obtenerParentescos: Mock<PersonasService['obtenerParentescos']>; guardarContactos: Mock<PersonasService['guardarContactos']>; buscarContactos: Mock<PersonasService['buscarContactos']>; obtenerBorrador: Mock<PersonasService['obtenerBorrador']>; guardarRegistroCompleto: Mock<PersonasService['guardarRegistroCompleto']>; limpiarBorrador: Mock<PersonasService['limpiarBorrador']> };
    let feedback: { notify: Mock<FeedbackService['notify']>; confirm: Mock<FeedbackService['confirm']> };
    let router: { navigate: Mock<Router['navigate']> };
    const nuevo = { nombre: 'Ana', apellido: 'Perez', fechaNacimiento: '1990-01-01', genero: 'Otro', correos: ['ana@example.com'], telefonos: ['5512345678'], idParentesco: 9 };
    beforeEach(() => {
        servicio = {
            obtenerContactos: vi.fn().mockName("PersonasService.obtenerContactos"),
            obtenerParentescos: vi.fn().mockName("PersonasService.obtenerParentescos"),
            guardarContactos: vi.fn().mockName("PersonasService.guardarContactos"),
            buscarContactos: vi.fn().mockName("PersonasService.buscarContactos"),
            obtenerBorrador: vi.fn().mockName("PersonasService.obtenerBorrador"),
            guardarRegistroCompleto: vi.fn().mockName("PersonasService.guardarRegistroCompleto"),
            limpiarBorrador: vi.fn().mockName("PersonasService.limpiarBorrador")
        };
        servicio.obtenerContactos.mockReturnValue(of([{ idContacto: 2, idParentesco: 9 }]));
        servicio.obtenerParentescos.mockReturnValue(of([]));
        servicio.guardarContactos.mockReturnValue(of({ ok: true }));
        servicio.buscarContactos.mockReturnValue(of([]));
        feedback = {
            notify: vi.fn().mockName("FeedbackService.notify"),
            confirm: vi.fn().mockName("FeedbackService.confirm")
        };
        feedback.confirm.mockResolvedValue(true);
        router = {
            navigate: vi.fn().mockName("Router.navigate")
        };
        TestBed.configureTestingModule({ providers: [
                { provide: PersonasService, useValue: servicio },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }), data: { modoContactos: 'agregar' } } } },
                { provide: Router, useValue: router },
                { provide: FeedbackService, useValue: feedback }
            ] });
        component = TestBed.runInInjectionContext(() => new ContactosComponent());
    });
    afterEach(() => component.ngOnDestroy());

    it('agrega y quita comunicaciones manteniendo al menos una de cada tipo por contacto', fakeAsync(() => {
        component.ngOnInit();
        component.agregarContacto(nuevo);
        for (const tipo of ['correos', 'telefonos'] as const) {
            component.agregarComunicacion(0, tipo);
            expect(component.comunicaciones(0, tipo).length).toBe(2);
            expect(component.comunicaciones(1, tipo).length).toBe(1);
            component.quitarComunicacion(0, tipo, 1);
            component.quitarComunicacion(0, tipo, 0);
            expect(component.comunicaciones(0, tipo).length).toBe(1);
        }
        tick(350);
        flushMicrotasks();
    }));

    it('valida los nuevos campos y rechaza comunicaciones repetidas', fakeAsync(() => {
        component.ngOnInit();
        component.contactos.at(0).patchValue(nuevo);
        component.agregarComunicacion(0, 'correos');
        component.agregarComunicacion(0, 'telefonos');
        const correos = component.comunicaciones(0, 'correos');
        const telefonos = component.comunicaciones(0, 'telefonos');
        expect(correos.at(1).hasError('required')).toBe(true);
        correos.at(1).setValue('incorrecto');
        telefonos.at(1).setValue('123');
        expect(correos.at(1).hasError('email')).toBe(true);
        expect(telefonos.at(1).hasError('pattern')).toBe(true);
        correos.at(1).setValue('ANA@example.com');
        telefonos.at(1).setValue(nuevo.telefonos[0]);
        expect(correos.hasError('repetidos')).toBe(true);
        expect(telefonos.hasError('repetidos')).toBe(true);
        tick(350);
        flushMicrotasks();
        component.guardarContactos();
        expect(servicio.guardarContactos).not.toHaveBeenCalled();
    }));

    it('guarda varios correos y teléfonos en un contacto nuevo', fakeAsync(() => {
        vi.spyOn(TestBed.inject(ActivatedRoute).snapshot.paramMap, 'get').mockReturnValue(null);
        servicio.obtenerBorrador.mockReturnValue({ nombre: 'Titular' } as Usuario);
        servicio.guardarRegistroCompleto.mockReturnValue(of({ ok: true }));
        component.ngOnInit();
        component.contactos.at(0).patchValue(nuevo);
        component.agregarComunicacion(0, 'correos');
        component.agregarComunicacion(0, 'telefonos');
        component.comunicaciones(0, 'correos').at(1).setValue('ana.extra@example.com');
        component.comunicaciones(0, 'telefonos').at(1).setValue('5512345679');
        tick(350);
        flushMicrotasks();
        expect(vi.mocked(servicio.buscarContactos).mock.lastCall![0].correos).toEqual(['ana@example.com', 'ana.extra@example.com']);
        component.guardarContactos();
        expect(servicio.guardarRegistroCompleto).toHaveBeenCalledWith([{ ...nuevo, idContacto: null,
                correos: ['ana@example.com', 'ana.extra@example.com'], telefonos: ['5512345678', '5512345679'] }]);
    }));

    it('edita las listas de comunicaciones sin perder los otros vínculos', fakeAsync(() => {
        servicio.obtenerContactos.mockReturnValue(of([{ ...nuevo, idContacto: 2,
                correos: ['ana@example.com', 'anterior@example.com'], telefonos: ['5512345678', '5512345679'] },
            { idContacto: 3, idParentesco: 7 }]));
        component.ngOnInit();
        component.modoAgregar = false;
        component.modoEdicion = true;
        component.contactoId = 2;
        component.cargarContactos();
        expect(component.comunicaciones(0, 'correos').length).toBe(2);
        component.quitarComunicacion(0, 'correos', 1);
        component.agregarComunicacion(0, 'correos');
        component.comunicaciones(0, 'correos').at(1).setValue('nuevo@example.com');
        component.quitarComunicacion(0, 'telefonos', 1);
        tick(350);
        flushMicrotasks();
        component.guardarContactos();
        flushMicrotasks();
        expect(servicio.guardarContactos).toHaveBeenCalledWith(1, [{ ...nuevo, idContacto: 2,
                correos: ['ana@example.com', 'nuevo@example.com'] }, { idContacto: 3, idParentesco: 7 }]);
    }));

    it('bloquea durante carga y error; conserva v?nculos al reintentar', fakeAsync(() => {
        const carga = new Subject<ContactoEmergencia[]>();
        servicio.obtenerContactos.mockReturnValue(carga);
        component.ngOnInit();
        component.guardarContactos();
        expect(servicio.guardarContactos).not.toHaveBeenCalled();
        carga.error(new Error('Fallo de red'));
        component.agregarContacto(nuevo);
        component.guardarContactos();
        expect(servicio.guardarContactos).not.toHaveBeenCalled();
        servicio.obtenerContactos.mockReturnValue(of([{ idContacto: 2, idParentesco: 9 }]));
        component.cargarContactos();
        component.contactos.at(0).patchValue(nuevo);
        tick(350);
        flushMicrotasks();
        component.guardarContactos();
        expect(servicio.guardarContactos).toHaveBeenCalledWith(1, [{ idContacto: 2, idParentesco: 9 }, { ...nuevo, idContacto: null }]);
        expect(router.navigate).toHaveBeenCalledWith(['/contactos', 1]);
    }));

    it('autocompleta previa confirmaci?n y env?a el ID conservando parentesco', fakeAsync(() => {
        servicio.buscarContactos.mockReturnValue(of([{ ...nuevo, idContacto: 8, idParentesco: undefined }]));
        component.ngOnInit();
        component.contactos.at(0).patchValue({ correos: [nuevo.correos[0]], idParentesco: 7 });
        component.guardarContactos();
        expect(servicio.guardarContactos).not.toHaveBeenCalled();
        tick(350);
        flushMicrotasks();
        expect(feedback.confirm).toHaveBeenCalled();
        expect(component.contactos.at(0).getRawValue()).toEqual({
            ...nuevo,
            idContacto: 8,
            idParentesco: 7,
            nombres: 'Ana',
            apellidoPaterno: 'Perez',
            apellidoMaterno: ''
        });
        component.agregarComunicacion(0, 'correos');
        component.quitarComunicacion(0, 'telefonos', 0);
        expect(component.comunicaciones(0, 'correos').length).toBe(1);
        expect(component.comunicaciones(0, 'telefonos').length).toBe(1);
        component.guardarContactos();
        expect(servicio.guardarContactos).toHaveBeenCalledWith(1, [{ idContacto: 2, idParentesco: 9 }, { idContacto: 8, idParentesco: 7 }]);
    }));

    it('borra el tel?fono si se rechaza el autocompletado', fakeAsync(() => {
        servicio.buscarContactos.mockReturnValue(of([{ ...nuevo, idContacto: 8 }]));
        feedback.confirm.mockResolvedValue(false);
        component.ngOnInit();
        component.contactos.at(0).patchValue({ nombre: 'Borrador', telefonos: [nuevo.telefonos[0]] });
        tick(350);
        flushMicrotasks();
        expect(component.contactos.at(0).get('telefonos.0')!.value).toBe('');
        expect(component.contactos.at(0).get('nombre')!.value).toBe('Borrador');
        expect(component.contactos.at(0).get('idContacto')!.value).toBeNull();
    }));

    it('ignora respuestas de b?squedas anteriores', fakeAsync(() => {
        const anterior = new Subject<ContactoEmergencia[]>();
        servicio.buscarContactos.mockReturnValueOnce(anterior).mockReturnValueOnce(of([]));
        component.ngOnInit();
        component.contactos.at(0).patchValue({ correos: [nuevo.correos[0]] });
        tick(350);
        component.contactos.at(0).patchValue({ correos: ['distinto@example.com'] });
        anterior.next([{ ...nuevo, idContacto: 8 }]);
        tick(350);
        flushMicrotasks();
        expect(feedback.confirm).not.toHaveBeenCalled();
        expect(component.contactos.at(0).get('correos.0')!.value).toBe('distinto@example.com');
    }));

    it('bloquea guardado cuando falla la consulta y permite reintentar', fakeAsync(() => {
        servicio.buscarContactos.mockReturnValue(throwError(() => new Error('Red')));
        component.ngOnInit();
        component.contactos.at(0).patchValue(nuevo);
        tick(350);
        flushMicrotasks();
        component.guardarContactos();
        expect(component.errorVerificacion).toBe(true);
        expect(servicio.guardarContactos).not.toHaveBeenCalled();
        servicio.buscarContactos.mockReturnValue(of([]));
        component.reintentarVerificacion();
        tick(350);
        flushMicrotasks();
        expect(component.errorVerificacion).toBe(false);
    }));

    it('reemplaza el v?nculo editado por el ID confirmado y vuelve a la lista', fakeAsync(() => {
        servicio.obtenerContactos.mockReturnValue(of([{ ...nuevo, idContacto: 2 }, { idContacto: 3, idParentesco: 7 }]));
        component.ngOnInit();
        component.modoAgregar = false;
        component.modoEdicion = true;
        component.contactoId = 2;
        component.cargarContactos();
        servicio.buscarContactos.mockReturnValue(of([{ ...nuevo, idContacto: 8, correos: ['otro@example.com'] }]));
        component.contactos.at(0).patchValue({ correos: ['otro@example.com'] });
        tick(350);
        flushMicrotasks();
        component.guardarContactos();
        flushMicrotasks();
        expect(servicio.guardarContactos).toHaveBeenCalledWith(1, [{ idContacto: 8, idParentesco: 9 }, { idContacto: 3, idParentesco: 7 }]);
        expect(router.navigate).toHaveBeenCalledWith(['/contactos', 1]);
    }));

    it('no elige arbitrariamente cuando hay varias coincidencias', fakeAsync(() => {
        servicio.buscarContactos.mockReturnValue(of([{ ...nuevo, idContacto: 8 }, { ...nuevo, idContacto: 9 }]));
        component.ngOnInit();
        component.contactos.at(0).patchValue({ correos: [nuevo.correos[0]] });
        tick(350);
        flushMicrotasks();
        expect(feedback.confirm).not.toHaveBeenCalled();
        expect(component.contactos.at(0).get('idContacto')!.value).toBeNull();
        expect(component.contactos.at(0).get('correos.0')!.value).toBe('');
    }));

    it('reutiliza el contacto durante el registro de una persona nueva', fakeAsync(() => {
        vi.spyOn(TestBed.inject(ActivatedRoute).snapshot.paramMap, 'get').mockReturnValue(null);
        servicio.obtenerBorrador.mockReturnValue({ nombre: 'Titular' } as Usuario);
        servicio.guardarRegistroCompleto.mockReturnValue(of({ ok: true }));
        servicio.buscarContactos.mockReturnValue(of([{ ...nuevo, idContacto: 8 }]));
        component.ngOnInit();
        component.contactos.at(0).patchValue({ telefonos: [nuevo.telefonos[0]], idParentesco: 7 });
        tick(350);
        flushMicrotasks();
        component.guardarContactos();
        expect(servicio.guardarRegistroCompleto).toHaveBeenCalledWith([{ idContacto: 8, idParentesco: 7 }]);
        expect(servicio.guardarContactos).not.toHaveBeenCalled();
        expect(servicio.limpiarBorrador).toHaveBeenCalled();
    }));
});
