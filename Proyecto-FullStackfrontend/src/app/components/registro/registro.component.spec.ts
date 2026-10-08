import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { RegistroComponent } from './registro.component';
import { PersonasService } from '../../services/personas.service';
import { CodigoPostalService } from '../../services/codigo-postal.service';
import { FeedbackService } from '../shared/feedback/feedback.service';
import { Usuario } from '../../interfaces/usuario.interface';

describe('RegistroComponent: carga por ID', () => {
  let component: RegistroComponent;
  let servicio: jasmine.SpyObj<PersonasService>;
  let servicioCP: jasmine.SpyObj<CodigoPostalService>;
  let respuesta: Subject<Usuario>;
  let ruta: { snapshot: { paramMap: ReturnType<typeof convertToParamMap> } };
  beforeEach(() => {
    respuesta = new Subject<Usuario>();
    servicio = jasmine.createSpyObj('PersonasService', ['obtenerPersonaPorId', 'obtenerOcupaciones', 'obtenerBorrador', 'actualizarPersona']);
    servicio.obtenerPersonaPorId.and.returnValue(respuesta);
    servicio.obtenerOcupaciones.and.returnValue(of([]));
    servicio.obtenerBorrador.and.returnValue(null);
    servicioCP = jasmine.createSpyObj('CodigoPostalService', ['consultar']);
    ruta = { snapshot: { paramMap: convertToParamMap({ id: '7' }) } };
    TestBed.configureTestingModule({ providers: [
      { provide: PersonasService, useValue: servicio },
      { provide: CodigoPostalService, useValue: servicioCP },
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
    respuesta.next({ id: 7, nombre: 'Titular', apellido: 'Prueba', genero: 'Otro', fechaNacimiento: '1990-01-01', ocupacion: 'Docente', correos: [], telefonos: [], direcciones: [] });
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

  it('inicia con un correo y un teléfono y permite agregarlos y quitarlos por separado', () => {
    ruta.snapshot.paramMap = convertToParamMap({});
    component.ngOnInit();

    expect(component.correos.length).toBe(1);
    expect(component.telefonos.length).toBe(1);

    component.agregarCorreo();
    expect(component.correos.length).toBe(2);
    expect(component.telefonos.length).toBe(1);
    component.quitarCorreo(1);
    component.quitarCorreo(0);
    expect(component.correos.length).toBe(1);

    component.agregarTelefono();
    expect(component.telefonos.length).toBe(2);
    expect(component.correos.length).toBe(1);
    component.quitarTelefono(1);
    component.quitarTelefono(0);
    expect(component.telefonos.length).toBe(1);
  });

  it('marca correos y teléfonos repetidos sin distinguir mayúsculas', () => {
    ruta.snapshot.paramMap = convertToParamMap({});
    component.ngOnInit();
    component.correos.at(0).setValue('persona@example.com');
    component.agregarCorreo();
    component.correos.at(1).setValue('PERSONA@example.com');
    component.telefonos.at(0).setValue('5512345678');
    component.agregarTelefono();
    component.telefonos.at(1).setValue('5512345678');

    expect(component.registroForm.hasError('correosRepetidos')).toBeTrue();
    expect(component.registroForm.hasError('telefonosRepetidos')).toBeTrue();
    expect(component.registroForm.invalid).toBeTrue();
  });

  it('valida el formato de cada correo y teléfono', () => {
    ruta.snapshot.paramMap = convertToParamMap({});
    component.ngOnInit();
    component.correos.at(0).setValue('correo-invalido');
    component.telefonos.at(0).setValue('12345');

    expect(component.correos.at(0).hasError('email')).toBeTrue();
    expect(component.telefonos.at(0).hasError('pattern')).toBeTrue();
  });

  it('mantiene al menos una dirección y consulta cada código postal en su grupo', () => {
    ruta.snapshot.paramMap = convertToParamMap({});
    servicioCP.consultar.and.callFake(codigoPostal => of({ resultados: [{
      asentamiento: codigoPostal === '42000' ? 'Centro' : 'La Providencia',
      estado: 'Hidalgo',
      municipio: codigoPostal === '42000' ? 'Pachuca' : 'Mineral de la Reforma'
    }] }));
    component.ngOnInit();

    expect(component.direcciones.length).toBe(1);
    component.quitarDireccion(0);
    expect(component.direcciones.length).toBe(1);
    component.agregarDireccion();
    expect(component.direcciones.length).toBe(2);

    component.direcciones.at(0).patchValue({ cp: '42000', calle: 'Calle Uno', numero: '1' });
    component.direcciones.at(1).patchValue({ cp: '42186', calle: 'Calle Dos', numero: '2' });
    component.buscarCodigoPostal(0);
    component.buscarCodigoPostal(1);

    expect(servicioCP.consultar).toHaveBeenCalledWith('42000');
    expect(servicioCP.consultar).toHaveBeenCalledWith('42186');
    expect(component.direcciones.at(0).get('colonia')?.value).toBe('Centro');
    expect(component.direcciones.at(1).get('colonia')?.value).toBe('La Providencia');
    expect(component.direcciones.at(0).get('municipio')?.value).toBe('Pachuca');
    expect(component.direcciones.at(1).get('municipio')?.value).toBe('Mineral de la Reforma');
  });

  it('envía codigoPostal desde el control cp al guardar una edición', () => {
    servicioCP.consultar.and.returnValue(of({ resultados: [] }));
    servicio.actualizarPersona.and.returnValue(of({ ok: true }));
    component.ngOnInit();
    respuesta.next({
      id: 7,
      nombre: 'Titular',
      apellido: 'Prueba',
      genero: 'Otro',
      fechaNacimiento: '1990-01-01',
      ocupacion: 'Docente',
      direcciones: [{ pais: 'México', estado: 'Hidalgo', municipio: 'Pachuca', colonia: 'Centro', codigoPostal: '', calle: 'Calle Uno', numero: '1' }]
    } as Usuario);
    component.registroForm.patchValue({ nombre: 'Titular', apellido: 'Prueba', genero: 'Otro', fechaNacimiento: '1990-01-01', ocupacion: 'Docente' });
    component.direcciones.at(0).patchValue({ cp: '42000', calle: 'Calle Editada', numero: '25' });
    component.correos.at(0).setValue('titular@example.com');
    component.telefonos.at(0).setValue('5512345678');

    component.onSubmit();

    const payload = servicio.actualizarPersona.calls.mostRecent().args[1];
    const direccion = payload.direcciones?.[0];
    expect(direccion?.codigoPostal).toBe('42000');
    expect(direccion?.calle).toBe('Calle Editada');
    expect(direccion?.numero).toBe('25');
    expect(Object.keys(direccion ?? {})).not.toContain('cp');
    expect(Object.keys(payload)).not.toContain('direccion');
    expect(Object.keys(payload)).not.toContain('ciudad');
  });

  it('conserva la dirección guardada sin consultar CP y muestra el error real al guardar', () => {
    servicio.actualizarPersona.and.returnValue(throwError(() => new Error('Revisa los campos de cada dirección')));
    component.ngOnInit();
    respuesta.next({ id: 7, nombre: 'Titular', apellido: 'Prueba', genero: 'Otro',
      fechaNacimiento: '1990-01-01', ocupacion: 'Docente', correos: ['titular@example.com'],
      telefonos: ['5512345678'],
      direcciones: [{ pais: 'México', estado: 'Hidalgo', municipio: 'Pachuca', colonia: 'Centro',
        codigoPostal: '42000', calle: 'Calle Uno', numero: '1' }] } as Usuario);
    expect(servicioCP.consultar).not.toHaveBeenCalled();
    component.direcciones.at(0).patchValue({ calle: 'Calle Editada', colonia: 'Colonia manual' });
    component.onSubmit();
    expect(servicio.actualizarPersona).toHaveBeenCalled();
    expect(component.mensajeError()).toBe('Revisa los campos de cada dirección');
    expect(component.guardando()).toBeFalse();
  });

  it('permite completar manualmente una dirección antigua si falla la consulta de CP', () => {
    servicioCP.consultar.and.returnValue(throwError(() => new Error('Sin conexión')));
    servicio.actualizarPersona.and.returnValue(of({ ok: true }));
    component.ngOnInit();
    respuesta.next({ id: 7, nombre: 'Titular', apellido: 'Prueba', genero: 'Otro',
      fechaNacimiento: '1990-01-01', ocupacion: 'Docente', correos: ['titular@example.com'],
      telefonos: ['5512345678'], direcciones: [{ pais: 'México',
        estado: '', municipio: 'Pachuca', colonia: '', codigoPostal: '', calle: 'Av. Revolucion 101', numero: '' }] } as Usuario);
    expect(component.direcciones.at(0).get('numero')?.value).toBe('101');
    component.direcciones.at(0).patchValue({ cp: '123' });
    expect(component.errorCampo('direcciones.0.cp')).toBe('Ingresa cinco dígitos.');
    component.direcciones.at(0).patchValue({ cp: '42000' });
    component.buscarCodigoPostal(0);
    expect(component.hayDireccionCargando).toBeFalse();
    component.direcciones.at(0).patchValue({ estado: 'Hidalgo', colonia: 'Centro', calle: 'Calle Nueva' });
    component.onSubmit();
    expect(servicio.actualizarPersona.calls.mostRecent().args[1].direcciones?.[0].calle).toBe('Calle Nueva');
  });
});
