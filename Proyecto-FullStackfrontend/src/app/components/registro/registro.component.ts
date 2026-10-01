import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { PersonasService } from '../../services/personas.service';
import { CodigoPostalService } from '../../services/codigo-postal.service';
import { FeedbackService } from '../shared/feedback/feedback.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit {
  private fb = inject(FormBuilder);
  private registroService = inject(PersonasService);
  private codigoPostalService = inject(CodigoPostalService);
  private feedbackService = inject(FeedbackService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  personaId: number | null = null;
  readonly cargandoPersona = signal(false);
  readonly guardando = signal(false);
  get editando(): boolean { return this.personaId !== null; }

  readonly personaCargada = signal(false);
  readonly edicionBloqueada = computed(() => this.guardando() || this.cargandoPersona() || (this.editando && !this.personaCargada()));

  registroForm!: FormGroup;
  ocupaciones: any[] = [];
  colonias: string[] = [];
  cargandoCP = false;
  readonly mensajeError = signal('');


  ngOnInit(): void {
    this.initForm();
    this.cargarOcupaciones();
    const id = this.route.snapshot.paramMap.get('id');
    const borrador = this.registroService.obtenerBorrador();
    if (id === null && borrador) {
      this.cargarComunicaciones(borrador);
      this.registroForm.patchValue(borrador);
      this.cargarDireccion(borrador.direccion, borrador.ciudad);
    }
    if (id !== null) {
      this.personaId = Number(id);
      this.registroForm.get('aceptaTerminos')?.disable();

      if (!Number.isSafeInteger(this.personaId) || this.personaId <= 0) {
        this.mensajeError.set('El ID de la persona no es válido.');
        return;
      }
      this.cargandoPersona.set(true);
      this.registroService.obtenerPersonaPorId(this.personaId).subscribe({
        next: persona => {
          this.cargandoPersona.set(false);
          if (!persona) {
            this.mensajeError.set('No se encontró la persona.');
            return;
          }
          this.cargarComunicaciones(persona);
          this.registroForm.patchValue({
            ...persona,
            aceptaTerminos: true
          });
          this.cargarDireccion(persona.direccion, persona.ciudad);
          this.personaCargada.set(true);
        },
        error: () => { this.cargandoPersona.set(false); this.mensajeError.set('No se pudo cargar la persona. Vuelve a intentarlo desde el dashboard.'); }
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
      correos: this.fb.array([this.crearControlCorreo()]),
      telefonos: this.fb.array([this.crearControlTelefono()]),

      aceptaTerminos: [false, Validators.requiredTrue]
    }, { validators: this.datosContactoDistintos });
  }

  get correos(): FormArray { return this.registroForm.get('correos') as FormArray; }
  get telefonos(): FormArray { return this.registroForm.get('telefonos') as FormArray; }

  agregarCorreo(): void {
    this.correos.push(this.crearControlCorreo());
  }

  quitarCorreo(index: number): void {
    if (this.correos.length > 1) this.correos.removeAt(index);
  }

  agregarTelefono(): void {
    this.telefonos.push(this.crearControlTelefono());
  }

  quitarTelefono(index: number): void {
    if (this.telefonos.length > 1) this.telefonos.removeAt(index);
  }

  private crearControlCorreo(valor = '') {
    return this.fb.control(valor, [Validators.required, Validators.email]);
  }

  private crearControlTelefono(valor = '') {
    return this.fb.control(valor, [Validators.required, Validators.pattern('^[0-9]{10}$')]);
  }

  private cargarComunicaciones(persona: { correos?: string[]; telefonos?: string[] }): void {
    for (const tipo of ['correos', 'telefonos'] as const) {
      const array = this.registroForm.get(tipo) as FormArray;
      array.clear();
      for (const valor of persona[tipo]?.length ? persona[tipo]! : ['']) {
        array.push(tipo === 'correos' ? this.crearControlCorreo(valor) : this.crearControlTelefono(valor));
      }
    }
  }

  private datosContactoDistintos(control: AbstractControl): ValidationErrors | null {
    const errores: ValidationErrors = {};
    for (const tipo of ['correos', 'telefonos']) {
      const valores: string[] = (control.get(tipo)?.value ?? []).map((v: string) => v.trim().toLowerCase()).filter(Boolean);
      if (new Set(valores).size !== valores.length) errores[tipo + 'Repetidos'] = true;
    }
    return Object.keys(errores).length ? errores : null;
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
        this.mensajeError.set('La dirección guardada no incluye código postal, colonia ni estado. Completa esos datos para consultar la ubicación.');
        return;
      }

      this.registroForm.patchValue({ calle: direccion || '' });
      this.mensajeError.set('La dirección guardada no tiene un formato reconocido. Completa calle, número, código postal, colonia y estado.');
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
          this.feedbackService.notify('Código postal no encontrado.', 'warning');
        }
      },
      error: () => {
        this.cargandoCP = false;
        this.feedbackService.notify('Error al consultar el servicio de código postal.', 'error');
      }
    });
  }
}

  cargarOcupaciones(): void {
    this.registroService.obtenerOcupaciones().subscribe({
      next: (data) => this.ocupaciones = data,
      error: () => this.mensajeError.set('No se pudieron cargar las ocupaciones.')
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
  if (this.edicionBloqueada() || this.cargandoCP) return;
  if (this.registroForm.invalid) {
    this.registroForm.markAllAsTouched();
    return;
  }

  const rawVal = this.registroForm.getRawValue();
  const direccionFormateada = `${rawVal.calle} #${rawVal.numero}, Col. ${rawVal.colonia}, C.P. ${rawVal.cp}, ${rawVal.estado}`;

  const payload = {
    nombre: rawVal.nombre, apellido: rawVal.apellido, genero: rawVal.genero,
    fechaNacimiento: rawVal.fechaNacimiento, ocupacion: rawVal.ocupacion,
    correos: rawVal.correos, telefonos: rawVal.telefonos,
    ciudad: rawVal.municipio,
    direccion: direccionFormateada
  };

  if (!this.editando) {
    this.registroService.guardarBorrador(payload);
    this.router.navigate(['/contactos']);
    return;
  }

  this.guardando.set(true);
  this.mensajeError.set('');
  const solicitud = this.personaId !== null
    ? this.registroService.actualizarPersona(this.personaId, payload)
    : this.registroService.crearPersona(payload);
  solicitud.subscribe({
    next: () => {
      this.guardando.set(false);
      this.feedbackService.notify('Datos guardados correctamente.', 'success');
      this.router.navigate(['/personas']);
    },
    error: (err) => {
      this.guardando.set(false);
      this.mensajeError.set(err.error?.message || 'Error al guardar el registro.');
    }
  });
}
}
