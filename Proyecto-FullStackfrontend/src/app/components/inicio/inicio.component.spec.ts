import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioComponent } from './inicio.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

describe('InicioComponent', () => {
  let component: InicioComponent;
  let fixture: ComponentFixture<InicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
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
