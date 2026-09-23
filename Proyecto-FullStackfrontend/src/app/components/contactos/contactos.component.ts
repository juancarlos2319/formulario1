import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { RegistroService } from '../../services/registro.service';

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contactos.component.html',
  styleUrl: './contactos.component.css'
})
export class ContactosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private registroService = inject(RegistroService);
  personaId = 0;
  nuevo = false;
  cargando = true;
  guardando = false;
  errorCarga = false;
  mensajeError = '';

  parentescos: string[] = [
    'Padre / Madre',
    'Cónyuge / Pareja',
    'Hijo / Hija',
    'Hermano / Hermana',
    'Familiar',
    'Tutor Legal',
    'Amigo / Amiga',
    'Compañero / Compañera de Trabajo',
    'Otro'
  ];

  contactosForm: FormGroup = this.fb.group({
    c1_nombre: ['', Validators.required],
    c1_telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    c1_parentesco: ['', Validators.required],
    c2_nombre: ['', Validators.required],
    c2_telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    c2_parentesco: ['', Validators.required]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.nuevo = id === null;
    if (this.nuevo) {
      if (!this.registroService.borrador) {
        this.router.navigate(['/registro']);
        return;
      }
      this.registroService.contactosBorrador.forEach((c, index) => this.contactosForm.patchValue({
        ['c' + (index + 1) + '_nombre']: c.nombre,
        ['c' + (index + 1) + '_telefono']: c.telefono,
        ['c' + (index + 1) + '_parentesco']: c.parentesco
      }));
      this.cargando = false;
      return;
    }
    this.personaId = Number(id);
    if (!Number.isSafeInteger(this.personaId) || this.personaId <= 0) {
      this.router.navigate(['/personas']);
      return;
    }
    this.cargarContactos();
  }

  cargarContactos(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.mensajeError = '';
    this.registroService.obtenerContactos(this.personaId).subscribe({
      next: contactos => {
        contactos.forEach((contacto, index) => this.contactosForm.patchValue({
          ['c' + (index + 1) + '_nombre']: contacto.nombre,
          ['c' + (index + 1) + '_telefono']: contacto.telefono,
          ['c' + (index + 1) + '_parentesco']: contacto.parentesco
        }));
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError = 'No se pudieron cargar los contactos. Reintenta antes de guardar.';
      }
    });
  }

  volver(): void {
    const valores = this.contactosForm.getRawValue();
    this.registroService.contactosBorrador = [1, 2].map(i => ({
      nombre: valores['c' + i + '_nombre'],
      telefono: valores['c' + i + '_telefono'],
      parentesco: valores['c' + i + '_parentesco']
    }));
    this.router.navigate(['/registro']);
  }

  errorCampo(nombre: string): string {
    const campo = this.contactosForm.get(nombre);
    if (!campo?.touched || !campo.errors) return '';
    return campo.hasError('pattern') ? 'Escribe exactamente 10 dígitos, sin espacios ni prefijo +52.' : 'Este campo es obligatorio.';
  }

  guardarContactos() {
    if (this.cargando || this.guardando || this.errorCarga) return;
    if (this.contactosForm.invalid) {
      this.contactosForm.markAllAsTouched();
      this.mensajeError = 'Revisa los campos marcados de ambos contactos.';
      return;
    }

    this.guardando = true;
    this.mensajeError = '';
    const valores = this.contactosForm.getRawValue();
    const contactos = [1, 2].map(i => ({
      nombre: valores['c' + i + '_nombre'].trim(),
      telefono: valores['c' + i + '_telefono'],
      parentesco: valores['c' + i + '_parentesco']
    }));
    if (this.nuevo) this.registroService.contactosBorrador = contactos;
    const solicitud: Observable<unknown> = this.nuevo
      ? this.registroService.guardarRegistroCompleto(contactos)
      : this.registroService.guardarContactos(this.personaId, contactos);
    solicitud.subscribe({
      next: () => {
        this.guardando = false;
        if (this.nuevo) this.registroService.limpiarBorrador();
        this.router.navigate(['/personas']);
      },
      error: (err) => {
        this.guardando = false;
        this.mensajeError = typeof err.error === 'string' ? err.error
          : (this.nuevo ? 'No se guardó el registro. Revisa los datos e intenta nuevamente.' : 'No se guardaron los contactos. Intenta nuevamente.');
      }
    });
  }
}
