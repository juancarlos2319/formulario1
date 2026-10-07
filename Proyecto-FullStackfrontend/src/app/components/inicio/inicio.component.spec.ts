import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioComponent } from './inicio.component';
import { AuthService } from '../../services/auth.service';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { provideAnimations, provideNoopAnimations } from '@angular/platform-browser/animations';

describe('InicioComponent', () => {
  let component: InicioComponent;
  let fixture: ComponentFixture<InicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
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
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    component.onLogin();
    expect(TestBed.inject(AuthService).login).not.toHaveBeenCalled();
  });

  it('muestra progreso, evita envíos repetidos y navega al completar el login', async () => {
    const respuesta = new Subject<any>();
    const auth = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    auth.login.and.returnValue(respuesta);
    router.navigate.and.resolveTo(true);
    component.credentials = { username: 'usuario-prueba', password: 'password-prueba' };
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();
    expect(auth.login).toHaveBeenCalledOnceWith(component.credentials);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    component.onLogin();
    expect(auth.login.calls.count()).toBe(1);
    respuesta.next({ token: 'token-prueba' });
    respuesta.complete();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });

  it('muestra el rechazo de credenciales y vuelve a permitir el envío', () => {
    const respuesta = new Subject<any>();
    const auth = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    auth.login.and.returnValue(respuesta);
    component.credentials = { username: 'usuario-prueba', password: 'incorrecta' };
    component.onLogin();
    respuesta.error({ status: 401 });
    fixture.detectChanges();
    expect(component.isLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Usuario o contraseña incorrectos');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('inicia vacío y habilita escritura y sugerencias solo al enfocar cada campo', () => {
    const usuario: HTMLInputElement = fixture.nativeElement.querySelector('#username');
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    expect(usuario.value).toBe('');
    expect(password.value).toBe('');
    expect(usuario.readOnly).toBeTrue();
    expect(password.readOnly).toBeTrue();
    expect(usuario.autocomplete).toBe('off');
    expect(password.autocomplete).toBe('off');
    usuario.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(usuario.readOnly).toBeFalse();
    expect(usuario.autocomplete).toBe('username');
    expect(password.readOnly).toBeTrue();
    password.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(password.readOnly).toBeFalse();
    expect(password.autocomplete).toBe('current-password');
    component.isLoading = true;
    fixture.detectChanges();
    expect(usuario.readOnly).toBeTrue();
    expect(password.readOnly).toBeTrue();
  });
});

describe('InicioComponent: animación real de entrada', () => {
  it('comprueba la preferencia real del navegador y la animación resultante', async () => {
    await TestBed.configureTestingModule({ imports: [InicioComponent], providers: [provideAnimations(),
      { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login']) },
      { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();
    await new Promise<void>(resolve => setTimeout(resolve, 200));
    fixture.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const tarjeta: HTMLElement = fixture.nativeElement.querySelector('.field');
    expect(tarjeta.getAnimations().length).toBeGreaterThan(0);
    if (fixture.componentInstance.movimientoReducido) {
      expect(fixture.componentInstance.entradas[11].params.desplazamiento).toBe('0px');
      expect(fixture.componentInstance.entradas[11].params.duracion).toBe(250);
    }
    const password = fixture.nativeElement.querySelectorAll('.field')[1] as HTMLElement;
    const boton = fixture.nativeElement.querySelector('.submit') as HTMLElement;
    const finUsuario = tarjeta.getAnimations()[0].effect!.getComputedTiming().endTime;
    const finPassword = password.getAnimations()[0].effect!.getComputedTiming().endTime;
    const finBoton = boton.getAnimations()[0].effect!.getComputedTiming().endTime;
    expect(Number(finPassword)).toBeGreaterThan(Number(finUsuario));
    expect(Number(finBoton)).toBeGreaterThan(Number(finPassword));
    await fixture.whenRenderingDone();
  });
  it('ejecuta la entrada en el primer render y deja el formulario visible al finalizar', async () => {
    const originalMatchMedia = window.matchMedia.bind(window);
    spyOn(window, 'matchMedia').and.callFake(query => query === '(prefers-reduced-motion: reduce)'
      ? { matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
          addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true } as MediaQueryList
      : originalMatchMedia(query));
    await TestBed.configureTestingModule({ imports: [InicioComponent], providers: [provideAnimations(),
      { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login']) },
      { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();
    await new Promise<void>(resolve => setTimeout(resolve, 200));
    fixture.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const tarjeta: HTMLElement = fixture.nativeElement.querySelector('.field');
    const animaciones = tarjeta.getAnimations();
    expect(animaciones.length).toBeGreaterThan(0);
    expect(animaciones.some(animacion => Number(animacion.effect?.getTiming().duration) >= 450)).toBeTrue();
    expect(animaciones.some(animacion => (animacion.effect as KeyframeEffect).getKeyframes()
      .some(fotograma => Number(fotograma['opacity']) === 0))).toBeTrue();
    await fixture.whenRenderingDone();
    expect(getComputedStyle(tarjeta).opacity).toBe('1');
  });
});

describe('InicioComponent: entrada desde el router', () => {
  it('anima al navegar al login después de renderizar la ruta', async () => {
    await TestBed.configureTestingModule({ providers: [provideAnimations(),
      provideRouter([{ path: 'inicio', component: InicioComponent }]),
      { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login']) }
    ] }).compileComponents();
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/inicio', InicioComponent);
    expect(component.entradas[11].value).toBe('oculto');
    await new Promise<void>(resolve => setTimeout(resolve, 200));
    harness.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    expect(component.entradas[11].value).toBe('visible');
    const tarjeta = harness.routeNativeElement!.querySelector('.field') as HTMLElement;
    expect(tarjeta.getAnimations().length).toBeGreaterThan(0);
    await harness.fixture.whenRenderingDone();
    expect(getComputedStyle(tarjeta).opacity).toBe('1');
  });
});
