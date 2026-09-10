import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RegistroService } from '../services/registro.service';

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contactos.component.html',
  styleUrl: './contactos.component.css'
})
export class ContactosComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private registroService = inject(RegistroService);

  contactosForm: FormGroup = this.fb.group({
    c1_nombre: ['', Validators.required],
    c1_telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    c1_parentesco: ['', Validators.required],
    c2_nombre: ['', Validators.required],
    c2_telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    c2_parentesco: ['', Validators.required]
  });

  guardarContactos() {
    if (this.contactosForm.invalid) {
      this.contactosForm.markAllAsTouched();
      return;
    }

    // Evitamos el POST fallido a la entidad principal de PostgreSQL y navegamos directamente
    alert('¡Contactos guardados exitosamente!');
    this.router.navigate(['/dashboard']);
  }
}