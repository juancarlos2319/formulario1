import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { RegistroService } from '../../services/registro.service';
import { Usuario } from '../../interfaces/usuario.interface';
import { ContactoEmergencia, Parentesco } from '../../interfaces/contacto-emergencia.interface';

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
  parentescos: Parentesco[] = [];

  private fb = inject(FormBuilder);
  private registroService = inject(RegistroService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    // Formulario dinámico inicializado
    this.contactosForm = this.fb.group({
      contactos: this.fb.array([])
    });
    this.cargarParentescos();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.personaId = +idParam;
      this.cargarContactos();
    } else {
      if (!this.registroService.obtenerBorrador()) {
        this.mensajeError = 'Primero completa los datos de la persona registrada.';
        this.router.navigate(['/registro']);
        return;
      }
      this.agregarContacto();
    }
  }

  // Getter conveniente para iterar con ngFor en la plantilla HTML
  get contactos(): FormArray {
    return this.contactosForm.get('contactos') as FormArray;
  }

  // Crea la estructura de un contacto
  crearContactoGroup(datos?: ContactoEmergencia): FormGroup {
    return this.fb.group({
      idContacto: [datos?.idContacto ?? null],
      nombre: [datos?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
      apellido: [datos?.apellido ?? '', [Validators.required, Validators.maxLength(100)]],
      fechaNacimiento: [datos?.fechaNacimiento ?? '', Validators.required],
      genero: [datos?.genero ?? '', Validators.required],
      email: [datos?.email ?? '', [Validators.required, Validators.email]],
      telefono: [datos?.telefono ?? '', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      idParentesco: [datos?.idParentesco ?? null, Validators.required]
    });
  }

  campoInvalido(index: number, nombre: string): boolean {
    const campo = this.contactos.at(index).get(nombre);
    return !!campo && campo.invalid && (campo.touched || campo.dirty);
  }

  errorCampo(index: number, nombre: string): string {
    const errores = this.contactos.at(index).get(nombre)?.errors;
    if (errores?.['required']) return 'Este campo es obligatorio.';
    if (errores?.['maxlength']) return 'No puede superar 100 caracteres.';
    if (errores?.['email']) return 'Escribe un correo electrónico válido.';
    if (errores?.['pattern']) return 'Ingresa diez dígitos.';
    return 'Revisa este campo.';
  }

  // Botón para agregar N contactos sin límite
  agregarContacto(datos?: ContactoEmergencia): void {
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
    this.registroService.obtenerContactos(this.personaId)
      .subscribe({
        next: (data) => {
          this.contactos.clear();
          if (data && data.length > 0) {
            data.forEach(contacto => this.agregarContacto(contacto));
          } else {
            this.agregarContacto();
            this.agregarContacto();
          }
        },
        error: (err) => {
          console.error('Error al cargar contactos:', err);
          this.mensajeError = err instanceof Error ? err.message : 'No se pudieron cargar los contactos.';
          if (this.contactos.length === 0) {
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

    const payload = this.contactos.getRawValue() as ContactoEmergencia[];
    const solicitud: Observable<ContactoEmergencia[] | Usuario> = this.personaId
      ? this.registroService.guardarContactos(this.personaId, payload)
      : this.registroService.guardarRegistroCompleto(payload);

    solicitud
      .subscribe({
        next: () => {
          this.mensajeExito = 'Contactos guardados correctamente.';
          this.registroService.limpiarBorrador();
          this.router.navigate(['/personas']);
        },
        error: (err) => {
          console.error('Error al guardar contactos:', err);
          this.mensajeError = err instanceof Error
            ? err.message
            : 'Ocurrio un error al guardar los contactos. Revisa los datos ingresados.';
        }
      });
  }

  private cargarParentescos(): void {
    this.registroService.obtenerParentescos().subscribe({
      next: (parentescos) => this.parentescos = parentescos,
      error: (err) => this.mensajeError = err instanceof Error ? err.message : 'No se pudieron cargar los parentescos.'
    });
  }
}
