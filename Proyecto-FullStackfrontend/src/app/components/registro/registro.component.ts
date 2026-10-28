import { Component, OnInit, inject, signal, computed } from '@angular/core';

import { AbstractControl, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { PersonasService } from '../../services/personas.service';
import { CodigoPostalService } from '../../services/codigo-postal.service';
import { FeedbackService } from '../shared/feedback/feedback.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

@Component({
    selector: 'app-registro',
    imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatSelectModule],
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
  /** Distingue la edición de un titular del primer paso de un alta. */
  get editando(): boolean { return this.personaId !== null; }

  readonly personaCargada = signal(false);
  /** Bloquea el guardado durante cargas, envíos o una edición aún no recuperada. */
  readonly edicionBloqueada = computed(() => this.guardando() || this.cargandoPersona() || (this.editando && !this.personaCargada()));
  /** Indica si alguna consulta postal sigue pendiente antes de permitir guardar. */
  get hayDireccionCargando(): boolean { return this.direccionesCargando().some(estado => estado); }

  registroForm!: FormGroup;
  ocupaciones: any[] = [];
  coloniasPorDireccion: string[][] = [];
  readonly direccionesCargando = signal<boolean[]>([]);
  readonly mensajeError = signal('');


  /** Prepara el formulario y carga el borrador o el titular indicado por la ruta. */
  ngOnInit(): void {
    this.initForm();
    this.cargarOcupaciones();
    const id = this.route.snapshot.paramMap.get('id');
    const borrador = this.registroService.obtenerBorrador();
    if (id === null && borrador) {
      this.cargarComunicaciones(borrador);
      this.cargarDirecciones(borrador);
      this.aplicarNombreDesdePersona(borrador);
      this.registroForm.patchValue({ ...borrador, ...this.separarNombre(borrador.nombre, borrador.apellido) });
    }
    if (id === null && !borrador) this.agregarDireccion();
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
            ...this.separarNombre(persona.nombre, persona.apellido),
            aceptaTerminos: true
          });
          this.cargarDirecciones(persona);
          this.personaCargada.set(true);
        },
        error: () => { this.cargandoPersona.set(false); this.mensajeError.set('No se pudo cargar la persona. Vuelve a intentarlo desde el dashboard.'); }
      });
    }
  }

  /** Define controles y validaciones, incluidas las colecciones dinámicas. */
  private initForm(): void {
    this.registroForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: ['', [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: ['', [Validators.minLength(2)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      genero: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      ocupacion: ['', Validators.required],

      direcciones: this.fb.array([], Validators.required),

      // Contacto Principal y Listas
      correos: this.fb.array([this.crearControlCorreo()]),
      telefonos: this.fb.array([this.crearControlTelefono()]),

      aceptaTerminos: [false, Validators.requiredTrue]
    }, { validators: this.datosContactoDistintos });
    this.sincronizarAliasNombre(this.registroForm);
  }

  /** Expone los controles de correo del titular. */
  get correos(): FormArray { return this.registroForm.get('correos') as FormArray; }
  /** Expone los controles de teléfono del titular. */
  get telefonos(): FormArray { return this.registroForm.get('telefonos') as FormArray; }
  /** Expone los grupos de dirección del formulario. */
  get direcciones(): FormArray { return this.registroForm.get('direcciones') as FormArray; }

  /** Crea una dirección con sus validaciones y valores iniciales o guardados. */
  private crearDireccionGroup(datos?: Partial<DireccionPersistida>): FormGroup {
    return this.fb.group({
      pais: [datos?.pais ?? 'México', Validators.required],
      estado: [datos?.estado ?? '', Validators.required],
      municipio: [datos?.municipio ?? '', Validators.required],
      colonia: [datos?.colonia ?? '', Validators.required],
      cp: [datos?.codigoPostal ?? '', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      calle: [datos?.calle ?? '', Validators.required],
      numero: [datos?.numero ?? '', Validators.required]
    });
  }

  /** Añade una dirección y prepara sus colonias y estado de consulta. */
  agregarDireccion(datos?: Partial<DireccionPersistida>): void {
    this.direcciones.push(this.crearDireccionGroup(datos));
    this.coloniasPorDireccion.push(datos?.colonia ? [datos.colonia] : []);
    this.direccionesCargando.update(estados => [...estados, false]);
  }

  /** Elimina una dirección y su estado postal sin quitar la última. */
  quitarDireccion(index: number): void {
    if (this.direcciones.length <= 1) return;
    this.direcciones.removeAt(index);
    this.coloniasPorDireccion.splice(index, 1);
    this.direccionesCargando.update(estados => estados.filter((_, i) => i !== index));
  }

  /** Restaura las direcciones guardadas sin consultar el servicio postal. */
  private cargarDirecciones(persona: { direcciones?: DireccionPersistida[] }): void {
    this.direcciones.clear();
    this.coloniasPorDireccion = [];
    this.direccionesCargando.set([]);
    if (persona.direcciones?.length) {
      persona.direcciones.forEach(direccion => {
        const datos = !direccion.numero && !direccion.codigoPostal
          ? { ...direccion, ...this.convertirDireccionAntigua(direccion.calle, direccion.municipio) }
          : direccion;
        this.agregarDireccion(datos);
      });
    } else {
      this.agregarDireccion();
    }
    // Conserva la ubicacion guardada sin depender de una consulta externa al abrir.
  }

  /** Descompone formatos antiguos de calle para recuperar los campos de dirección. */
  private convertirDireccionAntigua(direccion: string, ciudad: string): DireccionPersistida {
    const partes = /^(.*?) #(.+?), Col\. (.*?), C\.P\. (\d{5}), (.+)$/.exec(direccion);
    if (partes) {
      const [, calle, numero, colonia, codigoPostal, estado] = partes;
      return { pais: 'México', estado, municipio: ciudad, colonia, codigoPostal, calle, numero };
    }
    const sinFormato = /^(.*?)\s+(\d+[A-Za-z]?(?:\s*[-/]\s*\w+)?)\s*$/.exec(direccion.trim());
    if (sinFormato) {
      const [, calle, numero] = sinFormato;
      return { pais: 'México', estado: '', municipio: ciudad, colonia: '', codigoPostal: '', calle, numero };
    }
    return { pais: 'México', estado: '', municipio: ciudad, colonia: '', codigoPostal: '', calle: direccion, numero: '' };
  }

  /** Añade un control de correo con validación. */
  agregarCorreo(): void {
    this.correos.push(this.crearControlCorreo());
  }

  /** Retira un correo conservando al menos uno. */
  quitarCorreo(index: number): void {
    if (this.correos.length > 1) this.correos.removeAt(index);
  }

  /** Añade un control de teléfono con validación. */
  agregarTelefono(): void {
    this.telefonos.push(this.crearControlTelefono());
  }

  /** Retira un teléfono conservando al menos uno. */
  quitarTelefono(index: number): void {
    if (this.telefonos.length > 1) this.telefonos.removeAt(index);
  }

  /** Crea un correo obligatorio con validación de formato. */
  private crearControlCorreo(valor = '') {
    return this.fb.control(valor, [Validators.required, Validators.email]);
  }

  /** Crea un teléfono obligatorio de diez dígitos. */
  private crearControlTelefono(valor = '') {
    return this.fb.control(valor, [Validators.required, Validators.pattern('^[0-9]{10}$')]);
  }

  /** Adapta los nombres guardados a los controles separados del formulario. */
  private separarNombre(nombre?: string, apellido?: string): { nombres: string; apellidoPaterno: string; apellidoMaterno: string } {
    const apellidos = (apellido ?? '').trim();
    const partesApellido = apellidos.split(/\s+/).filter(Boolean);
    return {
      nombres: (nombre ?? '').trim(),
      apellidoPaterno: partesApellido[0] ?? '',
      apellidoMaterno: partesApellido.slice(1).join(' ')
    };
  }

  /** Mantiene compatibles los controles separados y los campos del contrato HTTP. */
  private sincronizarAliasNombre(form: FormGroup): void {
    /** Combina los nombres separados sin volver a disparar sus observadores. */
    const actualizarDesdeNuevos = () => {
      const nombres = (form.get('nombres')?.value ?? '').trim();
      const apellidoPaterno = (form.get('apellidoPaterno')?.value ?? '').trim();
      const apellidoMaterno = (form.get('apellidoMaterno')?.value ?? '').trim();
      const apellido = `${apellidoPaterno} ${apellidoMaterno}`.trim();
      if ((form.get('nombre')?.value ?? '') !== nombres) form.get('nombre')?.setValue(nombres, { emitEvent: false });
      if ((form.get('apellido')?.value ?? '') !== apellido) form.get('apellido')?.setValue(apellido, { emitEvent: false });
    };
    /** Distribuye los campos del contrato en los controles separados sin generar un ciclo. */
    const actualizarDesdeLegacy = () => {
      const nombre = (form.get('nombre')?.value ?? '').trim();
      const apellido = (form.get('apellido')?.value ?? '').trim();
      const { nombres, apellidoPaterno, apellidoMaterno } = this.separarNombre(nombre, apellido);
      if ((form.get('nombres')?.value ?? '') !== nombres) form.get('nombres')?.setValue(nombres, { emitEvent: false });
      if ((form.get('apellidoPaterno')?.value ?? '') !== apellidoPaterno) form.get('apellidoPaterno')?.setValue(apellidoPaterno, { emitEvent: false });
      if ((form.get('apellidoMaterno')?.value ?? '') !== apellidoMaterno) form.get('apellidoMaterno')?.setValue(apellidoMaterno, { emitEvent: false });
    };

    ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'nombre', 'apellido'].forEach(controlName => {
      form.get(controlName)?.valueChanges.subscribe(() => {
        if (controlName === 'nombre' || controlName === 'apellido') {
          actualizarDesdeLegacy();
        } else {
          actualizarDesdeNuevos();
        }
      });
    });

    actualizarDesdeNuevos();
  }

  /** Carga los nombres de una persona en los controles separados. */
  private aplicarNombreDesdePersona(persona: { nombre?: string; apellido?: string }): void {
    this.registroForm.patchValue(this.separarNombre(persona.nombre, persona.apellido));
    this.sincronizarAliasNombre(this.registroForm);
  }

  /** Reconstruye los correos y teléfonos guardados usando controles validados. */
  private cargarComunicaciones(persona: { correos?: string[]; telefonos?: string[] }): void {
    for (const tipo of ['correos', 'telefonos'] as const) {
      const array = this.registroForm.get(tipo) as FormArray;
      array.clear();
      for (const valor of persona[tipo]?.length ? persona[tipo]! : ['']) {
        array.push(tipo === 'correos' ? this.crearControlCorreo(valor) : this.crearControlTelefono(valor));
      }
    }
  }

  /** Marca correos o teléfonos repetidos después de normalizarlos. */
  private datosContactoDistintos(control: AbstractControl): ValidationErrors | null {
    const errores: ValidationErrors = {};
    for (const tipo of ['correos', 'telefonos']) {
      const valores: string[] = (control.get(tipo)?.value ?? []).map((v: string) => v.trim().toLowerCase()).filter(Boolean);
      if (new Set(valores).size !== valores.length) errores[tipo + 'Repetidos'] = true;
    }
    return Object.keys(errores).length ? errores : null;
  }

  /** Autocompleta ubicación por CP e ignora respuestas obsoletas o de grupos eliminados. */
  buscarCodigoPostal(index: number): void {
    const grupo = this.direcciones.at(index);
    const cp = grupo.get('cp')?.value;
    if (!cp || cp.length !== 5) {
      this.direccionesCargando.update(estados => estados.map((valor, i) => i === index ? false : valor));
      return;
    }

    this.direccionesCargando.update(estados => estados.map((valor, i) => i === index ? true : valor));
    this.codigoPostalService.consultar(cp).subscribe({
      next: (res) => {
        const indiceActual = this.direcciones.controls.indexOf(grupo);
        if (indiceActual < 0 || grupo.get('cp')?.value !== cp) return;
        this.direccionesCargando.update(estados => estados.map((valor, i) => i === indiceActual ? false : valor));

        if (res && res.resultados && res.resultados.length > 0) {
          const primerResultado = res.resultados[0];
          const colonias = res.resultados.map((r) => r.asentamiento);
          this.coloniasPorDireccion[indiceActual] = colonias;
          const coloniaActual = grupo.get('colonia')?.value;
          const colonia = colonias.includes(coloniaActual) ? coloniaActual : colonias[0] || '';

          grupo.patchValue({
            pais: 'México',
            estado: primerResultado.estado,
            municipio: primerResultado.municipio,
            colonia
          });
        } else {
          this.feedbackService.notify('Código postal no encontrado.', 'warning');
        }
      },
      error: () => {
        const indiceActual = this.direcciones.controls.indexOf(grupo);
        if (indiceActual < 0 || grupo.get('cp')?.value !== cp) return;
        this.direccionesCargando.update(estados => estados.map((valor, i) => i === indiceActual ? false : valor));
        this.feedbackService.notify('Error al consultar el servicio de código postal.', 'error');
      }
    });
  }

  /** Consulta las ocupaciones y muestra el error si no están disponibles. */
  cargarOcupaciones(): void {
    this.registroService.obtenerOcupaciones().subscribe({
      next: (data) => this.ocupaciones = data,
      error: () => this.mensajeError.set('No se pudieron cargar las ocupaciones.')
    });
  }

  /** Indica si debe mostrarse el error de un campo ya tocado o modificado. */
  campoInvalido(nombre: string): boolean {
    const campo = this.registroForm.get(nombre);
    return !!campo && campo.invalid && (campo.touched || campo.dirty);
  }

  /** Traduce la validación fallida del control a un mensaje de captura. */
  errorCampo(nombre: string): string {
    const errores = this.registroForm.get(nombre)?.errors;
    if (errores?.['required']) return 'Este campo es obligatorio.';
    if (errores?.['minlength']) return 'Escribe al menos dos caracteres.';
    if (errores?.['email']) return 'Escribe un correo electrónico válido.';
    if (errores?.['pattern']) return nombre.endsWith('.cp') || nombre === 'cp' ? 'Ingresa cinco dígitos.' : 'Ingresa diez dígitos.';
    return 'Revisa este campo.';
  }

  /** Convierte el formulario al DTO y guarda un borrador o actualiza el titular. */
  onSubmit(): void {
  if (this.edicionBloqueada() || this.hayDireccionCargando) return;
  if (this.registroForm.invalid) {
    this.registroForm.markAllAsTouched();
    return;
  }

  const rawVal = this.registroForm.getRawValue();
  const direcciones = rawVal.direcciones.map((direccion: DireccionFormulario) => ({
    pais: direccion.pais,
    estado: direccion.estado,
    municipio: direccion.municipio,
    colonia: direccion.colonia,
    codigoPostal: direccion.cp,
    calle: direccion.calle,
    numero: direccion.numero
  }));

  const apellidoCompleto = `${rawVal.apellidoPaterno ?? ''} ${rawVal.apellidoMaterno ?? ''}`.trim();
  const payload = {
    nombre: rawVal.nombres ?? rawVal.nombre, apellido: apellidoCompleto || rawVal.apellido || '', genero: rawVal.genero,
    fechaNacimiento: rawVal.fechaNacimiento, ocupacion: rawVal.ocupacion,
    correos: rawVal.correos, telefonos: rawVal.telefonos,
    direcciones
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
      this.mensajeError.set(err.message || err.error?.message || 'Error al guardar el registro.');
    }
  });
}
}

interface DireccionFormulario {
  pais: string;
  estado: string;
  municipio: string;
  colonia: string;
  cp: string;
  calle: string;
  numero: string;
}

interface DireccionPersistida {
  pais: string;
  estado: string;
  municipio: string;
  colonia: string;
  codigoPostal: string;
  calle: string;
  numero: string;
}
