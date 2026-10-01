import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent: cuenta autenticada', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['obtenerUsuarioActual', 'logout']);
    authService.obtenerUsuarioActual.and.returnValue(of({ nombre: 'Nombre de prueba', correo: 'persona@example.com' }));

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();
  });

  it('muestra nombre y correo del usuario actual', () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nombre de prueba');
    expect(fixture.nativeElement.textContent).toContain('persona@example.com');
  });

  it('muestra error si falla la consulta y mantiene pendiente la edición de cuenta', () => {
    authService.obtenerUsuarioActual.and.returnValue(throwError(() => new Error('fallo')));
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const error = root.querySelector('[role="alert"]') as HTMLElement;
    const buttons = root.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const editButton = Array.from(buttons)
      .find(button => button.textContent?.includes('Editar cuenta'));

    expect(error.textContent).toContain('No se pudieron cargar tus datos.');
    expect(editButton).toBeDefined();
    expect(editButton?.disabled).toBeTrue();
  });
});