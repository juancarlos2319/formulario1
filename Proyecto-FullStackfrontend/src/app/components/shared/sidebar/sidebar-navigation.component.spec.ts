import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../../services/auth.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

@Component({ standalone: true, template: '' })
class PaginaPrueba {}

describe('SidebarComponent: edición de persona', () => {
  it('activa el subapartado de edición y reserva Registro para las altas', async () => {
    await TestBed.configureTestingModule({ imports: [SidebarComponent], providers: [
      provideNoopAnimations(),
      provideRouter([{ path: 'registro', component: PaginaPrueba },
        { path: 'registro/:id', component: PaginaPrueba }, { path: 'personas', component: PaginaPrueba }]),
      { provide: AuthService, useValue: { logout: () => {} } }
    ] }).compileComponents();
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(SidebarComponent);
    const navegar = async (url: string) => {
      await router.navigateByUrl(url);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await navegar('/registro/7?origen=personas');
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.sub-item')?.textContent).toContain('Editar persona');
    expect(root.querySelector('.sub-item')?.getAttribute('href')).toBe('/registro/7');
    expect(root.querySelector('.sub-item')?.classList.contains('active')).toBeTrue();
    expect(root.querySelector('a[href="/registro"]')?.classList.contains('active')).toBeFalse();
    await navegar('/registro/8');
    expect(root.querySelector('.sub-item')?.getAttribute('href')).toBe('/registro/8');
    await navegar('/registro');
    expect(root.querySelector('.sub-item')).toBeNull();
    expect(root.querySelector('a[href="/registro"]')?.classList.contains('active')).toBeTrue();
    await navegar('/personas');
    expect(root.querySelector('.sub-item')).toBeNull();
    expect(root.querySelector('a[href="/personas"]')?.classList.contains('active')).toBeTrue();
  });
});
