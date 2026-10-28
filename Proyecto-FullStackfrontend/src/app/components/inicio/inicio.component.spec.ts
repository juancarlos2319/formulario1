import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InicioComponent } from './inicio.component';
import { AuthService } from '../../services/auth.service';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string): MediaQueryList => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => { },
            removeListener: () => { },
            addEventListener: () => { },
            removeEventListener: () => { },
            dispatchEvent: () => true
        })
    });
}
describe('InicioComponent', () => {
    let component: InicioComponent;
    let fixture: ComponentFixture<InicioComponent>;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [InicioComponent],
            providers: [
                { provide: AuthService, useValue: {
                        login: vi.fn().mockName("AuthService.login")
                    } },
                { provide: Router, useValue: {
                        navigate: vi.fn().mockName("Router.navigate")
                    } }
            ]
        })
            .compileComponents();
        fixture = TestBed.createComponent(InicioComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('muestra los campos Material y permite mostrar y ocultar la contraseña sin enviar', () => {
        expect(fixture.nativeElement.querySelectorAll('mat-form-field').length).toBe(2);
        const password: HTMLInputElement = fixture.nativeElement.querySelector('#password');
        const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.password-toggle');
        expect(password.type).toBe('password');
        boton.click();
        fixture.detectChanges();
        expect(password.type).toBe('text');
        expect(boton.getAttribute('aria-label')).toBe('Ocultar contraseña');
        boton.click();
        fixture.detectChanges();
        expect(password.type).toBe('password');
        expect(TestBed.inject(AuthService).login).not.toHaveBeenCalled();
    });
    it('bloquea el envío vacío y muestra los errores de los campos', async () => {
        await fixture.whenStable();
        const usuario: HTMLInputElement = fixture.nativeElement.querySelector('#username');
        usuario.dispatchEvent(new Event('blur'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('mat-error')?.textContent).toContain('Escribe tu usuario');
        expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
        component.onLogin();
        expect(TestBed.inject(AuthService).login).not.toHaveBeenCalled();
    });
    it('muestra progreso, evita envíos repetidos y navega al completar el login', async () => {
        const respuesta = new Subject<any>();
        const auth = TestBed.inject(AuthService) as MockedObject<AuthService>;
        const router = TestBed.inject(Router) as MockedObject<Router>;
        auth.login.mockReturnValue(respuesta);
        router.navigate.mockResolvedValue(true);
        component.credentials = { username: 'usuario-prueba', password: 'password-prueba' };
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('button[type="submit"]').click();
        fixture.detectChanges();
        expect(auth.login).toHaveBeenCalledTimes(1);
        expect(auth.login).toHaveBeenCalledWith(component.credentials);
        expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
        component.onLogin();
        expect(vi.mocked(auth.login).mock.calls.length).toBe(1);
        respuesta.next({ token: 'token-prueba' });
        respuesta.complete();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
        expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
    });
    it('muestra el rechazo de credenciales y vuelve a permitir el envío', () => {
        const respuesta = new Subject<any>();
        const auth = TestBed.inject(AuthService) as MockedObject<AuthService>;
        auth.login.mockReturnValue(respuesta);
        component.credentials = { username: 'usuario-prueba', password: 'incorrecta' };
        component.onLogin();
        respuesta.error({ status: 401 });
        fixture.detectChanges();
        expect(component.isLoading).toBe(false);
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Usuario o contraseña incorrectos');
        expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    });
    it('inicia vacío y habilita escritura y sugerencias solo al enfocar cada campo', () => {
        const usuario: HTMLInputElement = fixture.nativeElement.querySelector('#username');
        const password: HTMLInputElement = fixture.nativeElement.querySelector('#password');
        expect(usuario.value).toBe('');
        expect(password.value).toBe('');
        expect(usuario.readOnly).toBe(true);
        expect(password.readOnly).toBe(true);
        expect(usuario.autocomplete).toBe('off');
        expect(password.autocomplete).toBe('off');
        usuario.dispatchEvent(new Event('focus'));
        fixture.detectChanges();
        expect(usuario.readOnly).toBe(false);
        expect(usuario.autocomplete).toBe('username');
        expect(password.readOnly).toBe(true);
        password.dispatchEvent(new Event('focus'));
        fixture.detectChanges();
        expect(password.readOnly).toBe(false);
        expect(password.autocomplete).toBe('current-password');
        component.isLoading = true;
        fixture.detectChanges();
        expect(usuario.readOnly).toBe(true);
        expect(password.readOnly).toBe(true);
    });
});
describe('InicioComponent: animaciones CSS de entrada', () => {
    it('configura el escalonado y la duración de entrada', async () => {
        await TestBed.configureTestingModule({ imports: [InicioComponent], providers: [
            { provide: AuthService, useValue: { login: vi.fn() } },
            { provide: Router, useValue: { navigate: vi.fn() } }
        ] }).compileComponents();
        const fixture = TestBed.createComponent(InicioComponent);
        fixture.detectChanges();
        const campos = fixture.nativeElement.querySelectorAll('.field') as NodeListOf<HTMLElement>;
        expect(campos[0].style.getPropertyValue('--entrada-retraso')).toBe('480ms');
        expect(campos[1].style.getPropertyValue('--entrada-retraso')).toBe('600ms');
        expect(campos[0].style.getPropertyValue('--entrada-duracion')).toBe(`${fixture.componentInstance.duracionEntrada}ms`);
    });
});