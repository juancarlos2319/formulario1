import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { FeedbackService } from '../shared/feedback/feedback.service';
import { CuentaComponent } from './cuenta.component';

describe('CuentaComponent', () => {
    let auth: { obtenerDatosLogin: Mock<AuthService['obtenerDatosLogin']>; actualizarLogin: Mock<AuthService['actualizarLogin']>; logout: Mock<AuthService['logout']> };
    let component: CuentaComponent;
    beforeEach(async () => {
        auth = {
            obtenerDatosLogin: vi.fn().mockName("AuthService.obtenerDatosLogin"),
            actualizarLogin: vi.fn().mockName("AuthService.actualizarLogin"),
            logout: vi.fn().mockName("AuthService.logout")
        };
        auth.obtenerDatosLogin.mockReturnValue(of({ username: 'cuenta-prueba' }));
        auth.actualizarLogin.mockReturnValue(of({ ok: true }));
        await TestBed.configureTestingModule({ imports: [CuentaComponent], providers: [provideRouter([]),
                { provide: AuthService, useValue: auth },
                { provide: FeedbackService, useValue: { notify: vi.fn().mockName('notify') } }
            ] }).compileComponents();
        component = TestBed.createComponent(CuentaComponent).componentInstance;
        component.ngOnInit();
    });

    it('carga el usuario y rechaza confirmaciones distintas', () => {
        expect(component.formulario.controls.username.value).toBe('cuenta-prueba');
        component.formulario.patchValue({ passwordActual: 'actual-prueba', passwordNueva: 'nueva-prueba', confirmarPassword: 'distinta-prueba' });
        component.guardar();
        expect(auth.actualizarLogin).not.toHaveBeenCalled();
    });

    it('envia solo datos de login y cierra la sesion despues del OK', () => {
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        component.formulario.patchValue({ username: 'nuevo-usuario', passwordActual: 'actual-prueba' });
        component.guardar();
        expect(auth.actualizarLogin).toHaveBeenCalledWith({ username: 'nuevo-usuario', passwordActual: 'actual-prueba', passwordNueva: '' });
        expect(auth.logout).toHaveBeenCalledTimes(1);
        expect(router.navigate).toHaveBeenCalledWith(['/inicio'], { replaceUrl: true });
        expect(component.formulario.controls.passwordActual.value).toBe('');
    });

    it('rechaza usernames de más de 50 caracteres', () => {
        component.formulario.patchValue({ username: 'u'.repeat(51), passwordActual: 'actual-prueba' });

        expect(component.formulario.controls.username.hasError('maxlength')).toBe(true);
        component.guardar();
        expect(auth.actualizarLogin).not.toHaveBeenCalled();
    });

    it('no cierra sesion si el servidor no confirma el guardado', () => {
        auth.actualizarLogin.mockReturnValue(of({ ok: false }));
        component.formulario.patchValue({ passwordActual: 'actual-prueba' });
        component.guardar();
        expect(component.error()).toContain('no confirmó');
        expect(auth.logout).not.toHaveBeenCalled();
    });

    it('conserva la sesion y permite reintentar ante un usuario duplicado', () => {
        auth.actualizarLogin.mockReturnValue(throwError(() => ({ status: 409 })));
        component.formulario.patchValue({ passwordActual: 'actual-prueba' });
        component.guardar();
        expect(component.error()).toContain('ya está registrado');
        expect(component.guardando()).toBe(false);
        expect(auth.logout).not.toHaveBeenCalled();
    });
});
