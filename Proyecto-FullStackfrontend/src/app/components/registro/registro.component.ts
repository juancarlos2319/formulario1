import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { CodigoPostalService } from '../../services/codigo-postal.service';

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
  private codigoPostalService = inject(CodigoPostalService);
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
    const borrador = this.registroService.obtenerBorrador();
    if (id === null && borrador) {
      this.registroForm.patchValue(borrador);
      this.cargarDireccion(borrador.direccion, borrador.ciudad);
    }
    if (id !== null) {
      this.personaId = Number(id);
      this.registroForm.get('aceptaTerminos')?.disable();
      this.cargandoPersona = true;
      if (!Number.isSafeInteger(this.personaId) || this.personaId <= 0) {
        this.mensajeError = 'El ID de la persona no es válido.';
        return;
      }
      this.registroService.obtenerPersonaPorId(this.personaId).subscribe({
        next: persona => {
          if (!persona) {
            this.mensajeError = 'No se encontró la persona.';
            return;
          }
          this.registroForm.patchValue({
            ...persona,
            correosAdicionales: [persona.correosAdicionales?.[0] ?? ''],
            telefonosAdicionales: [persona.telefonosAdicionales?.[0] ?? ''],
            aceptaTerminos: true
          });
          this.cargarDireccion(persona.direccion, persona.ciudad);
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
      correosAdicionales: this.fb.array([this.fb.control('', [Validators.required, Validators.email])]),
      telefonosAdicionales: this.fb.array([this.fb.control('', [Validators.required, Validators.pattern('^[0-9]{10}$')])]),

      aceptaTerminos: [false, Validators.requiredTrue]
    }, { validators: this.datosContactoDistintos });
  }

  private datosContactoDistintos(control: AbstractControl): ValidationErrors | null {
    const email = control.get('email')?.value?.trim().toLowerCase();
    const emailSecundario = control.get('correosAdicionales.0')?.value?.trim().toLowerCase();
    const telefono = control.get('telefono')?.value?.trim();
    const telefonoSecundario = control.get('telefonosAdicionales.0')?.value?.trim();
    const errores: ValidationErrors = {};

    if (email && emailSecundario && email === emailSecundario) errores['emailRepetido'] = true;
    if (telefono && telefonoSecundario && telefono === telefonoSecundario) errores['telefonoRepetido'] = true;
    return Object.keys(errores).length ? errores : null;
  }

  contactoRepetido(tipo: 'email' | 'telefono'): boolean {
    const campoPrincipal = this.registroForm.get(tipo);
    const campoSecundario = this.registroForm.get(tipo === 'email' ? 'correosAdicionales.0' : 'telefonosAdicionales.0');
    const error = tipo === 'email' ? 'emailRepetido' : 'telefonoRepetido';
    return this.registroForm.hasError(error) && !!(campoPrincipal?.touched || campoSecundario?.touched);
  }

  private cargarDireccion(direccion: string, ciudad: string): void {
    // Formato usado al guardar: calle #numero, Col. colonia, C.P. cp, estado.
    const partes = /^(.*?) #(.+?), Col\. (.*?), C\.P\. (\d{5}), (.+)$/.exec(direccion || '');
    this.registroForm.patchValue({ municipio: ciudad });
    if (partes) {
      const [, calle, numero, colonia, cp, estado] = partes;
      this.colonias = [colonia];
      this.registroForm.patchValue({ calle, numero, colonia, cp, estado });
      this.buscarCodigoPostal();
    } else {
      const direccionAnterior = /^(.*?)\s+(\d+[A-Za-z]?(?:\s*[-/]\s*\w+)?)\s*$/.exec((direccion || '').trim());
      if (direccionAnterior) {
        const [, calle, numero] = direccionAnterior;
        this.registroForm.patchValue({ calle, numero });
        this.mensajeError = 'La dirección guardada no incluye código postal, colonia ni estado. Completa esos datos para consultar la ubicación.';
        return;
      }

      this.registroForm.patchValue({ calle: direccion || '' });
      this.mensajeError = 'La dirección guardada no tiene un formato reconocido. Completa calle, número, código postal, colonia y estado.';
    }
  }

  buscarCodigoPostal(): void {
  const cp = this.registroForm.get('cp')?.value;
  if (cp && cp.length === 5) {
    this.cargandoCP = true;
    this.codigoPostalService.consultar(cp).subscribe({
      next: (res) => {
        this.cargandoCP = false;

        if (res && res.resultados && res.resultados.length > 0) {
          const primerResultado = res.resultados[0];
          const estado = primerResultado.estado;
          const municipio = primerResultado.municipio; // Devuelve "Coyuca de Benítez"

          // Mapeamos los asentamientos/colonias correspondientes
          this.colonias = res.resultados.map((r) => r.asentamiento);
          const coloniaActual = this.registroForm.get('colonia')?.value;
          const colonia = this.colonias.includes(coloniaActual) ? coloniaActual : this.colonias[0] || '';

          // Asignamos a los campos bloqueados
          this.registroForm.patchValue({
            pais: 'México',
            estado: estado,
            municipio: municipio,
            colonia
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

  campoInvalido(nombre: string): boolean {
    const campo = this.registroForm.get(nombre);
    return !!campo && campo.invalid && (campo.touched || campo.dirty);
  }

  errorCampo(nombre: string): string {
    const errores = this.registroForm.get(nombre)?.errors;
    if (errores?.['required']) return 'Este campo es obligatorio.';
    if (errores?.['minlength']) return 'Escribe al menos dos caracteres.';
    if (errores?.['email']) return 'Escribe un correo electrónico válido.';
    if (errores?.['pattern']) return nombre === 'cp' ? 'Ingresa cinco dígitos.' : 'Ingresa diez dígitos.';
    return 'Revisa este campo.';
  }

  onSubmit(): void {
  if (this.cargandoPersona || this.guardando || this.cargandoCP) return;
  if (this.registroForm.invalid) {
    this.registroForm.markAllAsTouched();
    return;
  }

  const rawVal = this.registroForm.getRawValue();
  const direccionFormateada = `${rawVal.calle} #${rawVal.numero}, Col. ${rawVal.colonia}, C.P. ${rawVal.cp}, ${rawVal.estado}`;

  const payload = {
    ...rawVal,
    ciudad: rawVal.municipio,
    direccion: direccionFormateada
  };

  if (!this.editando) {
    this.registroService.guardarBorrador(payload);
    this.router.navigate(['/contactos']);
    return;
  }

  this.guardando = true;
  this.mensajeError = '';
  const solicitud = this.personaId !== null
    ? this.registroService.actualizarFormulario(this.personaId, payload)
    : this.registroService.guardarFormulario(payload);
  solicitud.subscribe({
    next: (res) => {
      this.guardando = false;
      if (this.editando) {
        this.router.navigate(['/personas']);
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
