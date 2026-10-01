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
  let servicio: jasmine.SpyObj<PersonasService>;
  let feedback: jasmine.SpyObj<FeedbackService>;
  let router: jasmine.SpyObj<Router>;
  const nuevo = { nombre: 'Ana', apellido: 'Perez', fechaNacimiento: '1990-01-01', genero: 'Otro', email: 'ana@example.com', telefono: '5512345678', idParentesco: 9 };
  beforeEach(() => {
    servicio = jasmine.createSpyObj('PersonasService', ['obtenerContactos', 'obtenerParentescos', 'guardarContactos', 'buscarContactos', 'obtenerBorrador', 'guardarRegistroCompleto', 'limpiarBorrador']);
    servicio.obtenerContactos.and.returnValue(of([{ idContacto: 2, idParentesco: 9 }]));
    servicio.obtenerParentescos.and.returnValue(of([]));
    servicio.guardarContactos.and.returnValue(of([]));
    servicio.buscarContactos.and.returnValue(of([]));
    feedback = jasmine.createSpyObj('FeedbackService', ['notify', 'confirm']);
    feedback.confirm.and.resolveTo(true);
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({ providers: [
      { provide: PersonasService, useValue: servicio },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }), data: { modoContactos: 'agregar' } } } },
      { provide: Router, useValue: router },
      { provide: FeedbackService, useValue: feedback }
    ] });
    component = TestBed.runInInjectionContext(() => new ContactosComponent());
  });
  afterEach(() => component.ngOnDestroy());

  it('bloquea durante carga y error; conserva v?nculos al reintentar', fakeAsync(() => {
    const carga = new Subject<ContactoEmergencia[]>();
    servicio.obtenerContactos.and.returnValue(carga);
    component.ngOnInit();
    component.guardarContactos();
    expect(servicio.guardarContactos).not.toHaveBeenCalled();
    carga.error(new Error('Fallo de red'));
    component.agregarContacto(nuevo);
    component.guardarContactos();
    expect(servicio.guardarContactos).not.toHaveBeenCalled();
    servicio.obtenerContactos.and.returnValue(of([{ idContacto: 2, idParentesco: 9 }]));
    component.cargarContactos();
    component.contactos.at(0).patchValue(nuevo);
    tick(350); flushMicrotasks();
    component.guardarContactos();
    expect(servicio.guardarContactos).toHaveBeenCalledWith(1, [{ idContacto: 2, idParentesco: 9 }, { ...nuevo, idContacto: null }]);
    expect(router.navigate).toHaveBeenCalledWith(['/contactos', 1]);
  }));

  it('autocompleta previa confirmaci?n y env?a el ID conservando parentesco', fakeAsync(() => {
    servicio.buscarContactos.and.returnValue(of([{ ...nuevo, idContacto: 8, idParentesco: undefined }]));
    component.ngOnInit();
    component.contactos.at(0).patchValue({ email: nuevo.email, idParentesco: 7 });
    component.guardarContactos();
    expect(servicio.guardarContactos).not.toHaveBeenCalled();
    tick(350); flushMicrotasks();
    expect(feedback.confirm).toHaveBeenCalled();
    expect(component.contactos.at(0).getRawValue()).toEqual({ ...nuevo, idContacto: 8, idParentesco: 7 });
    component.guardarContactos();
    expect(servicio.guardarContactos).toHaveBeenCalledWith(1, [{ idContacto: 2, idParentesco: 9 }, { idContacto: 8, idParentesco: 7 }]);
  }));

  it('borra el tel?fono si se rechaza el autocompletado', fakeAsync(() => {
    servicio.buscarContactos.and.returnValue(of([{ ...nuevo, idContacto: 8 }]));
    feedback.confirm.and.resolveTo(false);
    component.ngOnInit();
    component.contactos.at(0).patchValue({ nombre: 'Borrador', telefono: nuevo.telefono });
    tick(350); flushMicrotasks();
    expect(component.contactos.at(0).get('telefono')!.value).toBe('');
    expect(component.contactos.at(0).get('nombre')!.value).toBe('Borrador');
    expect(component.contactos.at(0).get('idContacto')!.value).toBeNull();
  }));

  it('ignora respuestas de b?squedas anteriores', fakeAsync(() => {
    const anterior = new Subject<ContactoEmergencia[]>();
    servicio.buscarContactos.and.returnValues(anterior, of([]));
    component.ngOnInit();
    component.contactos.at(0).patchValue({ email: nuevo.email });
    tick(350);
    component.contactos.at(0).patchValue({ email: 'distinto@example.com' });
    anterior.next([{ ...nuevo, idContacto: 8 }]);
    tick(350); flushMicrotasks();
    expect(feedback.confirm).not.toHaveBeenCalled();
    expect(component.contactos.at(0).get('email')!.value).toBe('distinto@example.com');
  }));

  it('bloquea guardado cuando falla la consulta y permite reintentar', fakeAsync(() => {
    servicio.buscarContactos.and.returnValue(throwError(() => new Error('Red')));
    component.ngOnInit();
    component.contactos.at(0).patchValue(nuevo);
    tick(350); flushMicrotasks();
    component.guardarContactos();
    expect(component.errorVerificacion).toBeTrue();
    expect(servicio.guardarContactos).not.toHaveBeenCalled();
    servicio.buscarContactos.and.returnValue(of([]));
    component.reintentarVerificacion();
    tick(350); flushMicrotasks();
    expect(component.errorVerificacion).toBeFalse();
  }));

  it('reemplaza el v?nculo editado por el ID confirmado y vuelve a la lista', fakeAsync(() => {
    servicio.obtenerContactos.and.returnValue(of([{ ...nuevo, idContacto: 2 }, { idContacto: 3, idParentesco: 7 }]));
    component.ngOnInit();
    component.modoAgregar = false;
    component.modoEdicion = true;
    component.contactoId = 2;
    component.cargarContactos();
    servicio.buscarContactos.and.returnValue(of([{ ...nuevo, idContacto: 8, email: 'otro@example.com' }]));
    component.contactos.at(0).patchValue({ email: 'otro@example.com' });
    tick(350); flushMicrotasks();
    component.guardarContactos(); flushMicrotasks();
    expect(servicio.guardarContactos).toHaveBeenCalledWith(1, [{ idContacto: 8, idParentesco: 9 }, { idContacto: 3, idParentesco: 7 }]);
    expect(router.navigate).toHaveBeenCalledWith(['/contactos', 1]);
  }));

  it('no elige arbitrariamente cuando hay varias coincidencias', fakeAsync(() => {
    servicio.buscarContactos.and.returnValue(of([{ ...nuevo, idContacto: 8 }, { ...nuevo, idContacto: 9 }]));
    component.ngOnInit();
    component.contactos.at(0).patchValue({ email: nuevo.email });
    tick(350); flushMicrotasks();
    expect(feedback.confirm).not.toHaveBeenCalled();
    expect(component.contactos.at(0).get('idContacto')!.value).toBeNull();
    expect(component.contactos.at(0).get('email')!.value).toBe('');
  }));

  it('reutiliza el contacto durante el registro de una persona nueva', fakeAsync(() => {
    spyOn(TestBed.inject(ActivatedRoute).snapshot.paramMap, 'get').and.returnValue(null);
    servicio.obtenerBorrador.and.returnValue({ nombre: 'Titular' } as Usuario);
    servicio.guardarRegistroCompleto.and.returnValue(of({ id: 10 } as Usuario));
    servicio.buscarContactos.and.returnValue(of([{ ...nuevo, idContacto: 8 }]));
    component.ngOnInit();
    component.contactos.at(0).patchValue({ telefono: nuevo.telefono, idParentesco: 7 });
    tick(350); flushMicrotasks();
    component.guardarContactos();
    expect(servicio.guardarRegistroCompleto).toHaveBeenCalledWith([{ idContacto: 8, idParentesco: 7 }]);
    expect(servicio.guardarContactos).not.toHaveBeenCalled();
    expect(servicio.limpiarBorrador).toHaveBeenCalled();
  }));
});
