import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ContactosListaComponent } from './contactos-lista.component';
import { PersonasService } from '../../services/personas.service';
import { FeedbackService } from '../shared/feedback/feedback.service';

describe('ContactosListaComponent: quitar vínculos', () => {
    let component: ContactosListaComponent;
    let servicio: { guardarContactos: Mock<PersonasService['guardarContactos']> };
    let feedback: { confirm: Mock<FeedbackService['confirm']>; notify: Mock<FeedbackService['notify']> };
    beforeEach(() => {
        servicio = {
            guardarContactos: vi.fn().mockName("PersonasService.guardarContactos")
        };
        feedback = {
            confirm: vi.fn().mockName("FeedbackService.confirm"),
            notify: vi.fn().mockName("FeedbackService.notify")
        };
        feedback.confirm.mockResolvedValue(true);
        TestBed.configureTestingModule({ providers: [
                { provide: PersonasService, useValue: servicio },
                { provide: FeedbackService, useValue: feedback },
                { provide: ActivatedRoute, useValue: {} }
            ] });
        component = TestBed.runInInjectionContext(() => new ContactosListaComponent());
        component.personaId = 1;
        component.cargando.set(false);
        component.contactos.set([{ idContacto: 2, idParentesco: 9 }, { idContacto: 3, idParentesco: 8, nombre: 'Ana' }]);
    });
    it('envía solo los vínculos restantes e impide quitar el último', async () => {
        servicio.guardarContactos.mockReturnValue(of({ ok: true }));
        await component.quitarContacto(component.contactos()[0]);
        expect(servicio.guardarContactos).toHaveBeenCalledWith(1, [{ idContacto: 3, idParentesco: 8 }]);
        expect(component.contactos().length).toBe(1);
        await component.quitarContacto(component.contactos()[0]);
        expect(servicio.guardarContactos).toHaveBeenCalledTimes(1);
    });
    it('no envía cambios al cancelar', async () => {
        feedback.confirm.mockResolvedValue(false);
        await component.quitarContacto(component.contactos()[0]);
        expect(servicio.guardarContactos).not.toHaveBeenCalled();
        expect(component.quitando()).toBe(false);
    });
    it('conserva la lista cuando falla el guardado', async () => {
        servicio.guardarContactos.mockReturnValue(throwError(() => new Error('Fallo')));
        await component.quitarContacto(component.contactos()[0]);
        expect(component.contactos().length).toBe(2);
        expect(component.mensajeError()).toBeTruthy();
        expect(component.quitando()).toBe(false);
    });
});
