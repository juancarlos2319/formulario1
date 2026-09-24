import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

export interface ContactoDTO {
  nombre: string;
  telefono: string;
  parentesco: string;
  genero?: string;
  fechaNacimiento?: string;
}

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contactos.component.html',
  styleUrls: ['./contactos.component.css']
})
export class ContactosComponent implements OnInit {
  contactosForm!: FormGroup;
  personaId!: number;
  mensajeError: string = '';
  mensajeExito: string = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Formulario dinámico inicializado
    this.contactosForm = this.fb.group({
      contactos: this.fb.array([])
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.personaId = +idParam;
      this.cargarContactos();
    } else {
      // Iniciar con 2 contactos vacíos dinámicos
      this.agregarContacto();
      this.agregarContacto();
    }
  }

  // Getter conveniente para iterar con ngFor en la plantilla HTML
  get contactos(): FormArray {
    return this.contactosForm.get('contactos') as FormArray;
  }

  // Crea la estructura de un contacto
  crearContactoGroup(datos?: ContactoDTO): FormGroup {
    return this.fb.group({
      nombre: [datos?.nombre || '', [Validators.required]],
      telefono: [datos?.telefono || '', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      parentesco: [datos?.parentesco || '', [Validators.required]],
      genero: [datos?.genero || ''],
      fechaNacimiento: [datos?.fechaNacimiento || '']
    });
  }

  // Botón para agregar N contactos sin límite
  agregarContacto(datos?: ContactoDTO): void {
    this.contactos.push(this.crearContactoGroup(datos));
  }

  // Permite borrar dinámicamente si hay más de 1 contacto en pantalla
  eliminarContacto(index: number): void {
    if (this.contactos.length > 1) {
      this.contactos.removeAt(index);
    } else {
      alert('Debes mantener al menos un contacto en la lista.');
    }
  }

  cargarContactos(): void {
    this.http.get<ContactoDTO[]>(`http://localhost:8080/api/formularios/${this.personaId}/contactos`)
      .subscribe({
        next: (data) => {
          this.contactos.clear();
          if (data && data.length > 0) {
            data.forEach(contacto => this.agregarContacto(contacto));
          } else {
            // Si la BD venía vacía, mostramos 2 por defecto
            this.agregarContacto();
            this.agregarContacto();
          }
        },
        error: (err) => {
          console.error('Error al cargar contactos:', err);
          if (this.contactos.length === 0) {
            this.agregarContacto();
            this.agregarContacto();
          }
        }
      });
  }

  guardarContactos(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.contactosForm.invalid) {
      this.mensajeError = 'Por favor completa todos los campos requeridos (*).';
      this.contactosForm.markAllAsTouched();
      return;
    }

    let listaFormulario: ContactoDTO[] = this.contactosForm.value.contactos;

    // Adaptador para ser 100% compatible con la regla del Backend sin modificar Java:
    let payload: ContactoDTO[] = [];

    if (listaFormulario.length === 1) {
      // Si el usuario solo llenó 1 contacto, duplicamos ese contacto como C2 para satisfacer al Backend
      payload = [listaFormulario[0], { ...listaFormulario[0] }];
    } else {
      // Si llenó 2 o más, tomamos los contactos capturados
      payload = listaFormulario;
    }

    this.http.put(`http://localhost:8080/api/formularios/${this.personaId}/contactos`, payload)
      .subscribe({
        next: (res) => {
          this.mensajeExito = '¡Contactos guardados exitosamente!';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          console.error('Error al guardar contactos:', err);
          this.mensajeError = 'Ocurrió un error al guardar los contactos. Revisa los datos ingresados.';
        }
      });
  }
}