import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarjetaUsuarioComponent } from './tarjeta-usuario.component';

describe('TarjetaUsuarioComponent', () => {
  let component: TarjetaUsuarioComponent;
  let fixture: ComponentFixture<TarjetaUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarjetaUsuarioComponent);
    component = fixture.componentInstance;
    component.usuario = { id: 1, nombre: 'Persona de prueba', apellido: 'Prueba', ocupacion: '', correos: [], telefonos: [], fechaNacimiento: '1990-01-01', genero: 'Otro', direcciones: [] };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
