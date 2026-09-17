import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
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
  cargando = true;
  guardando = false;
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
    this.personaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(this.personaId) || this.personaId <= 0) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.registroService.obtenerContactos(this.personaId).subscribe({
      next: contactos => {
        contactos.forEach((contacto, index) => this.contactosForm.patchValue({
          ['c' + (index + 1) + '_nombre']: contacto.nombre,
          ['c' + (index + 1) + '_telefono']: contacto.telefono,
          ['c' + (index + 1) + '_parentesco']: contacto.parentesco
        }));
        this.cargando = false;
      },
      error: () => { this.mensajeError = 'No se pudieron cargar los contactos. Intenta abrir la página nuevamente.'; }
    });
  }

  guardarContactos() {
    if (this.cargando || this.guardando) return;
    if (this.contactosForm.invalid) {
      this.contactosForm.markAllAsTouched();
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
    this.registroService.guardarContactos(this.personaId, contactos).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.guardando = false;
        this.mensajeError = 'No se guardaron los contactos. Revisa los datos e inténtalo nuevamente.';
      }
    });
  }
}
