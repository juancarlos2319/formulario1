import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardComponent } from './dashboard.component';
import { PersonasService } from '../../services/personas.service';
import { Resumen } from '../../interfaces/usuario.interface';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let servicio: jasmine.SpyObj<PersonasService>;
  let respuesta: Subject<Resumen>;
  const resumen: Resumen = { total: 4, conCorreo: 3, conTelefono: 2,
    ocupaciones: [{ nombre: 'Docente', cantidad: 3 }, { nombre: 'Ingeniero', cantidad: 1 }] };

  beforeEach(async () => {
    respuesta = new Subject<Resumen>();
    servicio = jasmine.createSpyObj('PersonasService', ['obtenerResumen']);
    servicio.obtenerResumen.and.returnValue(respuesta);
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), provideNoopAnimations(), { provide: PersonasService, useValue: servicio }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra progreso durante la consulta y datos del backend en las tarjetas Material', () => {
    expect(fixture.nativeElement.querySelector('mat-progress-bar[mode="indeterminate"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.stats')).toBeNull();
    respuesta.next(resumen);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-progress-bar[mode="indeterminate"]')).toBeNull();
    const tarjetas = fixture.nativeElement.querySelectorAll('.stats mat-card');
    expect(tarjetas.length).toBe(4);
    expect(Array.from(fixture.nativeElement.querySelectorAll('.stat-value'))
      .map(elemento => (elemento as HTMLElement).textContent?.trim())).toEqual(['4', '3', '2', '16']);
    const barras = fixture.nativeElement.querySelectorAll('.bar-row mat-progress-bar');
    expect(barras[0].getAttribute('aria-valuenow')).toBe('75');
    expect(barras[1].getAttribute('aria-valuenow')).toBe('25');
    expect(fixture.nativeElement.querySelector('.register-action').getAttribute('href')).toBe('/registro');
  });

  it('oculta las acciones de alta cuando ya hay veinte personas', () => {
    respuesta.next({ ...resumen, total: 20 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.register-action')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/registro"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/personas"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.capacity-notice').textContent).toContain('límite de 20');
  });

  it('muestra el estado vacío sin porcentajes inválidos', () => {
    respuesta.next({ total: 0, conCorreo: 0, conTelefono: 0, ocupaciones: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty').textContent).toContain('primera persona');
    expect(fixture.nativeElement.querySelectorAll('.bar-row').length).toBe(0);
    expect(component.lugaresDisponibles).toBe(20);
  });

  it('permite reintentar con el botón Material cuando falla la consulta', () => {
    respuesta.error(new Error('Fallo de red'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No se pudo cargar');
    servicio.obtenerResumen.and.returnValue(of(resumen));
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    expect(servicio.obtenerResumen.calls.count()).toBe(2);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(component.resumen().total).toBe(4);
  });

  it('actualiza el resumen desde la acción Material', () => {
    respuesta.next(resumen);
    fixture.detectChanges();
    servicio.obtenerResumen.and.returnValue(of({ ...resumen, total: 5 }));
    fixture.nativeElement.querySelector('.refresh-action').click();
    fixture.detectChanges();
    expect(servicio.obtenerResumen.calls.count()).toBe(2);
    expect(fixture.nativeElement.querySelector('.stat-value').textContent).toBe('5');
  });
});
