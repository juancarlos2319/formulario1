import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PersonasComponent } from './personas.component';
import { PersonasService } from '../../services/personas.service';
import { FeedbackService } from '../shared/feedback/feedback.service';

describe('PersonasComponent: proteccion de administradores', () => {
  it('desactiva eliminar para administradores y evita pedir su baja', async () => {
    const personas = jasmine.createSpyObj('PersonasService', ['obtenerPersonas', 'eliminarPersona']);
    const feedback = jasmine.createSpyObj('FeedbackService', ['confirm', 'notify']);
    personas.obtenerPersonas.and.returnValue(of([
      { id: 1, nombre: 'Administrador prueba', apellido: '', correos: [], telefonos: [], ocupacion: '', puedeEliminar: false },
      { id: 2, nombre: 'Persona prueba', apellido: '', correos: [], telefonos: [], ocupacion: '', puedeEliminar: true }
    ]));
    await TestBed.configureTestingModule({ imports: [PersonasComponent], providers: [provideRouter([]), provideNoopAnimations(),
      { provide: PersonasService, useValue: personas }, { provide: FeedbackService, useValue: feedback }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(PersonasComponent);
    fixture.detectChanges();
    const botones = fixture.nativeElement.querySelectorAll('button.danger') as NodeListOf<HTMLButtonElement>;
    expect(botones[0].disabled).toBeTrue();
    expect(botones[1].disabled).toBeFalse();
    await fixture.componentInstance.eliminar(1);
    expect(feedback.confirm).not.toHaveBeenCalled();
    expect(personas.eliminarPersona).not.toHaveBeenCalled();
  });
});
