import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { RegistroService } from '../../services/registro.service';

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
  private route = inject(ActivatedRoute);
  personaId: number | null = null;
  cargandoPersona = false;
  guardando = false;
  get editando(): boolean { return this.personaId !== null; }

  registroForm!: FormGroup;
  ocupaciones: any[] = [];
  colonias: string[] = [];
  cargandoCP = false;
  mensajeError = '';


  ngOnInit(): void {
    this.initForm();
    this.cargarOcupaciones();
    const id = this.route.snapshot.paramMap.get('id');
    if (id !== null) {
      this.personaId = Number(id);
      this.cargandoPersona = true;
      if (!Number.isSafeInteger(this.personaId) || this.personaId <= 0) {
        this.mensajeError = 'El ID de la persona no es válido.';
        return;
      }
      // La API conserva la dirección completa, no sus campos separados.
      for (const campo of ['cp', 'pais', 'estado', 'municipio', 'colonia', 'calle', 'numero']) {
        this.registroForm.get(campo)?.disable();
      }
      this.registroForm.get('direccion')?.enable();
      this.registroForm.get('ciudad')?.enable();
      this.registroService.obtenerPersonaPorId(this.personaId).subscribe({
        next: persona => {
          if (!persona) {
            this.mensajeError = 'No se encontró la persona.';
            return;
          }
          this.registroForm.patchValue({ ...persona, aceptaTerminos: true });
          this.cargandoPersona = false;
        },
        error: () => { this.mensajeError = 'No se pudo cargar la persona. Vuelve a intentarlo desde el dashboard.'; }
      });
    }
  }

  private initForm(): void {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      genero: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      ocupacion: ['', Validators.required],
      direccion: [{ value: '', disabled: true }, Validators.required],
      ciudad: [{ value: '', disabled: true }, Validators.required],
      
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
  if (this.cargandoPersona || this.guardando) return;
  if (this.registroForm.invalid) {
    this.registroForm.markAllAsTouched();
    return;
  }

  const rawVal = this.registroForm.getRawValue();
  const direccionFormateada = `${rawVal.calle} #${rawVal.numero}, Col. ${rawVal.colonia}, C.P. ${rawVal.cp}, ${rawVal.estado}`;
  
  const payload = {
    ...rawVal,
    ciudad: this.editando ? rawVal.ciudad : rawVal.municipio,
    direccion: this.editando ? rawVal.direccion : direccionFormateada
  };

  this.guardando = true;
  this.mensajeError = '';
  const solicitud = this.personaId !== null
    ? this.registroService.actualizarFormulario(this.personaId, payload)
    : this.registroService.guardarFormulario(payload);
  solicitud.subscribe({
    next: (res) => {
      this.guardando = false;
      if (this.editando) {
        this.router.navigate(['/dashboard']);
        return;
      }
      // Redirige directamente al formulario de contactos pasando el ID generado
      if (res.id) this.router.navigate(['/contactos', res.id]);
      else this.mensajeError = 'La respuesta del registro no contiene un ID para añadir los contactos.';
    },
    error: (err) => {
      this.guardando = false;
      this.mensajeError = err.error?.message || 'Error al guardar el registro.';
    }
  });
}
}
