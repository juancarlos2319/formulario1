import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { RegistroComponent } from './registro.component';
import { PersonasService } from '../../services/personas.service';
import { CodigoPostalService } from '../../services/codigo-postal.service';
import { FeedbackService } from '../shared/feedback/feedback.service';
import { Usuario } from '../../interfaces/usuario.interface';

describe('RegistroComponent: carga por ID', () => {
  let component: RegistroComponent;
  let servicio: jasmine.SpyObj<PersonasService>;
  let respuesta: Subject<Usuario>;
  let ruta: { snapshot: { paramMap: ReturnType<typeof convertToParamMap> } };
  beforeEach(() => {
    respuesta = new Subject<Usuario>();
    servicio = jasmine.createSpyObj('PersonasService', ['obtenerPersonaPorId', 'obtenerOcupaciones', 'obtenerBorrador', 'actualizarPersona']);
    servicio.obtenerPersonaPorId.and.returnValue(respuesta);
    servicio.obtenerOcupaciones.and.returnValue(of([]));
    servicio.obtenerBorrador.and.returnValue(null);
    ruta = { snapshot: { paramMap: convertToParamMap({ id: '7' }) } };
    TestBed.configureTestingModule({ providers: [
      { provide: PersonasService, useValue: servicio },
      { provide: CodigoPostalService, useValue: jasmine.createSpyObj('CodigoPostalService', ['consultar']) },
      { provide: FeedbackService, useValue: jasmine.createSpyObj('FeedbackService', ['notify']) },
      { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      { provide: ActivatedRoute, useValue: ruta }
    ] });
    component = TestBed.runInInjectionContext(() => new RegistroComponent());
  });
  it('carga solo el titular solicitado y actualiza las señales', () => {
    component.ngOnInit();
    expect(servicio.obtenerPersonaPorId).toHaveBeenCalledOnceWith(7);
    expect(component.cargandoPersona()).toBeTrue();
    expect(component.edicionBloqueada()).toBeTrue();
    respuesta.next({ id: 7, nombre: 'Titular', direccion: '', ciudad: '' } as Usuario);
    expect(component.registroForm.get('nombre')!.value).toBe('Titular');
    expect(component.cargandoPersona()).toBeFalse();
    expect(component.personaCargada()).toBeTrue();
    expect(component.edicionBloqueada()).toBeFalse();
  });
  it('termina la carga pero impide guardar si falla la consulta', () => {
    component.ngOnInit();
    respuesta.error(new Error('No encontrado'));
    expect(component.cargandoPersona()).toBeFalse();
    expect(component.mensajeError()).toBeTruthy();
    expect(component.edicionBloqueada()).toBeTrue();
    component.onSubmit();
    expect(servicio.actualizarPersona).not.toHaveBeenCalled();
  });
  it('no consulta IDs invalidos', () => {
    ruta.snapshot.paramMap = convertToParamMap({ id: 'invalido' });
    component.ngOnInit();
    expect(servicio.obtenerPersonaPorId).not.toHaveBeenCalled();
    expect(component.cargandoPersona()).toBeFalse();
    expect(component.edicionBloqueada()).toBeTrue();
  });
  it('el alta nueva no realiza una consulta individual', () => {
    ruta.snapshot.paramMap = convertToParamMap({});
    component.ngOnInit();
    expect(servicio.obtenerPersonaPorId).not.toHaveBeenCalled();
    expect(component.edicionBloqueada()).toBeFalse();
  });
});
