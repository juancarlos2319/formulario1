import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AdminLayoutComponent } from '../admin-layout/admin-layout.component';

describe('AdminLayoutComponent: cuenta autenticada', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let movil: BehaviorSubject<{ matches: boolean }>;

  beforeEach(async () => {
    movil = new BehaviorSubject<{ matches: boolean }>({ matches: false });
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['obtenerUsuarioActual', 'logout'],
      { usuarioActual: signal({ nombre: 'Nombre de prueba', correo: 'persona@example.com' }) });
    authService.obtenerUsuarioActual.and.returnValue(of({ nombre: 'Nombre de prueba', correo: 'persona@example.com' }));

    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideNoopAnimations(),
        { provide: BreakpointObserver, useValue: { observe: () => movil.asObservable() } },
        provideRouter([{ path: 'dashboard', children: [] }]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();
  });

  it('muestra nombre y correo del usuario actual', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('header').textContent).toContain('Nombre de prueba');
    expect(authService.obtenerUsuarioActual).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('persona@example.com');
  });

  it('muestra error si falla la consulta y permite abrir la edición de cuenta', () => {
    authService.obtenerUsuarioActual.and.returnValue(throwError(() => new Error('fallo')));
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const error = root.querySelector('[role="alert"]') as HTMLElement;
    const editLink = root.querySelector('a.editar-cuenta') as HTMLAnchorElement;

    expect(error.textContent).toContain('No se pudieron cargar tus datos.');
    expect(editLink).toBeTruthy();
    expect(editLink.getAttribute('href')).toBe('/cuenta');
  });

  it('usa menú lateral fijo en escritorio y conserva la barra Material', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    const menu = fixture.debugElement.query(By.directive(MatSidenav)).componentInstance as MatSidenav;
    expect(menu.mode).toBe('side');
    expect(menu.opened).toBeTrue();
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu-toggle')).toBeNull();
  });

  it('abre el menú superpuesto en móvil y lo cierra al elegir una sección', async () => {
    movil.next({ matches: true });
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const menu = fixture.debugElement.query(By.directive(MatSidenav)).componentInstance as MatSidenav;
    expect(menu.mode).toBe('over');
    expect(menu.opened).toBeFalse();
    fixture.nativeElement.querySelector('.menu-toggle').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(menu.opened).toBeTrue();
    fixture.nativeElement.querySelector('app-sidebar .brand').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(menu.opened).toBeFalse();
  });
});
