import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RegistroService } from '../services/registro.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit {
  private fb = inject(FormBuilder);
  private registroService = inject(RegistroService);
  private router = inject(Router);

  registroForm!: FormGroup;
  ocupaciones: any[] = [];
  mensajeError = '';

  ngOnInit(): void {
    this.initForm();
    this.cargarOcupaciones();
  }

  private initForm(): void {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      ciudad: ['', Validators.required],
      direccion: [''],
      genero: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      ocupacion: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      
      // Arrays dinámicos limitados
      correosAdicionales: this.fb.array([]),
      telefonosAdicionales: this.fb.array([]),

      // Contacto de emergencia
      contactoEmergenciaNombre: ['', Validators.required],
      contactoEmergenciaTelefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      contactoEmergenciaParentesco: ['', Validators.required],

      aceptaTerminos: [false, Validators.requiredTrue]
    });
  }

  get correosAdicionales(): FormArray {
    return this.registroForm.get('correosAdicionales') as FormArray;
  }

  get telefonosAdicionales(): FormArray {
    return this.registroForm.get('telefonosAdicionales') as FormArray;
  }

  agregarCorreo(): void {
    if (this.correosAdicionales.length < 1) { // 1 principal + 1 adicional = máx 2
      this.correosAdicionales.push(this.fb.control('', [Validators.required, Validators.email]));
    }
  }

  eliminarCorreo(index: number): void {
    this.correosAdicionales.removeAt(index);
  }

  agregarTelefono(): void {
    if (this.telefonosAdicionales.length < 1) { // 1 principal + 1 adicional = máx 2
      this.telefonosAdicionales.push(this.fb.control('', [Validators.required, Validators.pattern('^[0-9]{10}$')]));
    }
  }

  eliminarTelefono(index: number): void {
    this.telefonosAdicionales.removeAt(index);
  }

  cargarOcupaciones(): void {
    this.registroService.obtenerOcupaciones().subscribe({
      next: (data) => this.ocupaciones = data,
      error: () => this.mensajeError = 'No se pudieron cargar las ocupaciones.'
    });
  }

  onSubmit(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    this.registroService.guardarFormulario(this.registroForm.value).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.mensajeError = err.error?.message || 'Error al guardar el registro. Comprueba el límite de 20 personas.';
      }
    });
  }
}