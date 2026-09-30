import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { RegistroService } from '../../services/registro.service';
import { Usuario } from '../../interfaces/usuario.interface';
import { ContactoEmergencia, Parentesco } from '../../interfaces/contacto-emergencia.interface';
import { FeedbackService } from '../shared/feedback/feedback.service';

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contactos.component.html',
  styleUrls: ['../shared/admin-pages.css', './contactos.component.css']
})
export class ContactosComponent implements OnInit {
  contactosForm!: FormGroup;
  personaId = 0;
  contactoId: number | null = null;
  modoEdicion = false;
  modoAgregar = false;
  contactosOriginales: ContactoEmergencia[] = [];
  mensajeError: string = '';
  mensajeExito: string = '';
  parentescos: Parentesco[] = [];

  private fb = inject(FormBuilder);
  private registroService = inject(RegistroService);
  private feedbackService = inject(FeedbackService);
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
      this.personaId = Number(idParam);
      this.modoEdicion = this.route.snapshot.data['modoContactos'] === 'editar';
      this.modoAgregar = this.route.snapshot.data['modoContactos'] === 'agregar';
      const contactoId = this.route.snapshot.paramMap.get('contactoId');
      this.contactoId = contactoId === null ? null : Number(contactoId);
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

  numeroContacto(index: number): number {
    const idContacto = this.contactos.at(index).get('idContacto')?.value as number | null;
    if (this.modoEdicion && idContacto != null) {
      const indiceOriginal = this.contactosOriginales.findIndex(contacto => contacto.idContacto === idContacto);
      if (indiceOriginal >= 0) return indiceOriginal + 1;
    }
    if (this.modoEdicion) return this.contactosOriginales.length + index;
    if (this.modoAgregar) return this.contactosOriginales.length + index + 1;
    return index + 1;
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
    if (this.modoEdicion && this.contactos.at(index).get('idContacto')?.value != null) return;
    if (this.contactos.length > 1) {
      this.contactos.removeAt(index);
    } else {
      this.feedbackService.notify('Debes mantener al menos un contacto en la lista.', 'warning');
    }
  }

  cargarContactos(): void {
    this.registroService.obtenerContactos(this.personaId)
      .subscribe({
        next: (data) => {
          this.contactosOriginales = data ?? [];
          this.contactos.clear();
          if (this.modoEdicion) {
            const contacto = this.contactosOriginales.find(item => item.idContacto === this.contactoId);
            if (!contacto) {
              this.feedbackService.notify('No se encontró el vínculo que intentas editar.', 'error');
              this.router.navigate(['/contactos', this.personaId]);
              return;
            }
            this.agregarContacto(contacto);
          } else {
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

  async guardarContactos(): Promise<void> {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.contactosForm.invalid) {
      this.mensajeError = 'Por favor completa todos los campos requeridos (*).';
      this.contactosForm.markAllAsTouched();
      return;
    }

    if (this.modoEdicion) {
      const contacto = this.contactos.getRawValue()[0] as ContactoEmergencia;
      const confirmado = await this.feedbackService.confirm({
        title: 'Actualizar datos del contacto',
        message: `Los cambios de ${contacto.nombre} ${contacto.apellido} se aplicarán a todos los titulares que comparten este contacto. ¿Deseas continuar?`,
        confirmLabel: 'Actualizar contacto'
      });
      if (!confirmado) return;
    }

    const editados = this.contactos.controls.map(control => {
      const contacto = control.getRawValue() as ContactoEmergencia;
      return contacto;
    });
    let payload: ContactoEmergencia[];
    if (this.modoEdicion) {
      const contactoActualizado = editados.find(contacto => contacto.idContacto === this.contactoId);
      payload = this.contactosOriginales.map(contacto => contacto.idContacto === this.contactoId
        ? { ...contactoActualizado, idContacto: contacto.idContacto }
        : { idContacto: contacto.idContacto, idParentesco: contacto.idParentesco });
      payload.push(...editados.filter(contacto => contacto.idContacto == null));
    } else if (this.modoAgregar) {
      payload = [
        ...this.contactosOriginales.map(contacto => ({
          idContacto: contacto.idContacto,
          idParentesco: contacto.idParentesco
        })),
        ...editados
      ];
    } else {
      payload = editados;
    }

    const solicitud: Observable<ContactoEmergencia[] | Usuario> = this.personaId > 0
      ? this.registroService.guardarContactos(this.personaId, payload)
      : this.registroService.guardarRegistroCompleto(payload);

    solicitud
      .subscribe({
        next: () => {
          this.feedbackService.notify('Contactos guardados correctamente.', 'success');
          if (this.personaId === 0) this.registroService.limpiarBorrador();
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

  cancelar(): void {
    if (this.personaId > 0) {
      this.router.navigate(['/contactos', this.personaId]);
    } else {
      this.router.navigate(['/registro']);
    }
  }

  private cargarParentescos(): void {
    this.registroService.obtenerParentescos().subscribe({
      next: (parentescos) => this.parentescos = parentescos,
      error: (err) => this.mensajeError = err instanceof Error ? err.message : 'No se pudieron cargar los parentescos.'
    });
  }
}
