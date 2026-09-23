import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { Usuario } from '../../services/usuario.interface';

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
      this.registroForm.get('aceptaTerminos')?.disable();
      this.cargandoPersona = true;
      if (!Number.isSafeInteger(this.personaId) || this.personaId <= 0) {
        this.mensajeError = 'El ID de la persona no es válido.';
        return;
      }
      this.registroService.obtenerPersonaPorId(this.personaId).subscribe({
        next: (persona: Usuario | any) => {
          if (!persona) {
            this.mensajeError = 'No se encontró la persona.';
            return;
          }
          
          // Mapeo de datos básicos
          this.registroForm.patchValue({
            nombre: persona.nombre,
            apellido: persona.apellido,
            genero: persona.genero,
            fechaNacimiento: persona.fechaNacimiento,
            ocupacion: typeof persona.ocupacion === 'object' ? persona.ocupacion?.nombre : persona.ocupacion,
            aceptaTerminos: true
          });

          // Mapeo de Correos desde la lista de Spring Boot
          if (persona.correos && persona.correos.length > 0) {
            this.registroForm.patchValue({
              email: persona.correos[0]?.email || persona.correos[0]?.correo || persona.email || '',
              emailSecundario: persona.correos[1]?.email || persona.correos[1]?.correo || ''
            });
          } else if (persona.email) {
            this.registroForm.patchValue({ email: persona.email });
          }

          // Mapeo de Teléfonos desde la lista de Spring Boot
          if (persona.telefonos && persona.telefonos.length > 0) {
            this.registroForm.patchValue({
              telefono: persona.telefonos[0]?.telefono || persona.telefonos[0]?.numero || persona.telefono || '',
              telefonoSecundario: persona.telefonos[1]?.telefono || persona.telefonos[1]?.numero || ''
            });
          } else if (persona.telefono) {
            this.registroForm.patchValue({ telefono: persona.telefono });
          }

          this.cargarDireccion(persona.direccion, persona.ciudad);
          this.cargandoPersona = false;
        },
        error: () => { 
          this.mensajeError = 'No se pudo cargar la persona. Vuelve a intentarlo desde el dashboard.'; 
          this.cargandoPersona = false;
        }
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
      
      // Campos de Dirección
      cp: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      pais: [{ value: 'México', disabled: true }, Validators.required],
      estado: [{ value: '', disabled: true }, Validators.required],
      municipio: [{ value: '', disabled: true }, Validators.required],
      colonia: ['', Validators.required],
      calle: ['', Validators.required],
      numero: ['', Validators.required],

      // Contactos Fijos y Obligatorios
      email: ['', [Validators.required, Validators.email]],
      emailSecundario: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      telefonoSecundario: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],

      aceptaTerminos: [false, Validators.requiredTrue]
    });
  }

  private cargarDireccion(direccion: string, ciudad: string): void {
    const partes = /^(.*?) #(.+?), Col\. (.*?), C\.P\. (\d{5}), (.+)$/.exec(direccion || '');
    this.registroForm.patchValue({ municipio: ciudad });
    if (partes) {
      const [, calle, numero, colonia, cp, estado] = partes;
      this.colonias = [colonia];
      this.registroForm.patchValue({ calle, numero, colonia, cp, estado });
    } else {
      this.registroForm.patchValue({ calle: direccion || '' });
    }
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
            const municipio = primerResultado.municipio;
            
            this.colonias = res.resultados.map((r: any) => r.asentamiento);

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
    
    // Convertimos los campos del formulario en el formato de lista que espera Spring Boot
    const payload: any = {
      nombre: rawVal.nombre,
      apellido: rawVal.apellido,
      genero: rawVal.genero,
      fechaNacimiento: rawVal.fechaNacimiento,
      ocupacion: rawVal.ocupacion,
      ciudad: rawVal.municipio,
      direccion: direccionFormateada,
      email: rawVal.email,
      telefono: rawVal.telefono,
      correos: [
        { email: rawVal.email },
        { email: rawVal.emailSecundario }
      ],
      telefonos: [
        { telefono: rawVal.telefono },
        { telefono: rawVal.telefonoSecundario }
      ]
    };

    this.guardando = true;
    this.mensajeError = '';
    const solicitud = this.personaId !== null
      ? this.registroService.actualizarFormulario(this.personaId, payload)
      : this.registroService.guardarFormulario(payload);

    solicitud.subscribe({
      next: (res: any) => {
        this.guardando = false;
        if (this.editando) {
          this.router.navigate(['/dashboard']);
          return;
        }
        if (res && res.id) {
          this.router.navigate(['/contactos', res.id]);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: any) => {
        this.guardando = false;
        this.mensajeError = err.error?.message || 'Error al guardar el registro.';
      }
    });
  }
}