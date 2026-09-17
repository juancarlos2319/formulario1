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
  colonias: string[] = [];
  cargandoCP = false;
  mensajeError = '';

  // Opciones predefinidas para Parentesco
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

  ngOnInit(): void {
    this.initForm();
    this.cargarOcupaciones();
  }

  private initForm(): void {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      genero: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      ocupacion: ['', Validators.required],
      
      // Campos detallados de Dirección
      cp: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      pais: [{ value: 'México', disabled: true }, Validators.required],
      estado: [{ value: '', disabled: true }, Validators.required],
      municipio: [{ value: '', disabled: true }, Validators.required],
      colonia: ['', Validators.required],
      calle: ['', Validators.required],
      numero: ['', Validators.required],

      // Contacto Principal y Listas
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      correosAdicionales: this.fb.array([]),
      telefonosAdicionales: this.fb.array([]),

      // Contacto de Emergencia
      contactoEmergenciaNombre: ['', Validators.required],
      contactoEmergenciaTelefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      contactoEmergenciaParentesco: ['', Validators.required],

      aceptaTerminos: [false, Validators.requiredTrue]
    });
  }

  buscarCodigoPostal(): void {
  const cp = this.registroForm.get('cp')?.value;
  if (cp && cp.length === 5) {
    this.cargandoCP = true;
    this.registroService.consultarCP(cp).subscribe({
      next: (res: any) => {
        this.cargandoCP = false;
        
        if (res && res.resultados && res.resultados.length > 0) {
          const primerResultado = res.resultados[0];
          const estado = primerResultado.estado;
          const municipio = primerResultado.municipio; // Devuelve "Coyuca de Benítez"
          
          // Mapeamos los asentamientos/colonias correspondientes
          this.colonias = res.resultados.map((r: any) => r.asentamiento);

          // Asignamos a los campos bloqueados
          this.registroForm.patchValue({
            pais: 'México',
            estado: estado,
            municipio: municipio,
            colonia: this.colonias[0] || ''
          });
        } else {
          alert('Código Postal no encontrado.');
        }
      },
      error: () => {
        this.cargandoCP = false;
        alert('Error al consultar el servicio de Código Postal.');
      }
    });
  }
}

  get correosAdicionales(): FormArray {
    return this.registroForm.get('correosAdicionales') as FormArray;
  }

  get telefonosAdicionales(): FormArray {
    return this.registroForm.get('telefonosAdicionales') as FormArray;
  }

  agregarCorreo(): void {
    if (this.correosAdicionales.length < 1) {
      this.correosAdicionales.push(this.fb.control('', [Validators.required, Validators.email]));
    }
  }

  eliminarCorreo(index: number): void {
    this.correosAdicionales.removeAt(index);
  }

  agregarTelefono(): void {
    if (this.telefonosAdicionales.length < 1) {
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

    // getRawValue() incluye los valores de inputs deshabilitados (país, estado, municipio)
    const rawVal = this.registroForm.getRawValue();

    // Formatear dirección completa para la BD actual sin alterarla
    const direccionFormateada = `${rawVal.calle} #${rawVal.numero}, Col. ${rawVal.colonia}, C.P. ${rawVal.cp}, ${rawVal.estado}`;
    
    const payload = {
      ...rawVal,
      ciudad: rawVal.municipio, // Mapea Municipio a la columna ciudad existente
      direccion: direccionFormateada
    };

    this.registroService.guardarFormulario(payload).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.mensajeError = err.error?.message || 'Error al guardar el registro.';
      }
    });
  }
}