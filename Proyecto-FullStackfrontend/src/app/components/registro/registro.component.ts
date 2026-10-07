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
  get hayDireccionCargando(): boolean { return this.direccionesCargando().some(estado => estado); }

  registroForm!: FormGroup;
  ocupaciones: any[] = [];
  coloniasPorDireccion: string[][] = [];
  readonly direccionesCargando = signal<boolean[]>([]);
  readonly mensajeError = signal('');


  ngOnInit(): void {
    this.initForm();
    this.cargarOcupaciones();
    const id = this.route.snapshot.paramMap.get('id');
    const borrador = this.registroService.obtenerBorrador();
    if (id === null && borrador) {
      this.cargarComunicaciones(borrador);
      this.cargarDirecciones(borrador);
      this.registroForm.patchValue(borrador);
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
            aceptaTerminos: true
          });
          this.cargarDirecciones(persona);
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

      direcciones: this.fb.array([], Validators.required),

      // Contacto Principal y Listas
      correos: this.fb.array([this.crearControlCorreo()]),
      telefonos: this.fb.array([this.crearControlTelefono()]),

      aceptaTerminos: [false, Validators.requiredTrue]
    }, { validators: this.datosContactoDistintos });
  }

  get correos(): FormArray { return this.registroForm.get('correos') as FormArray; }
  get telefonos(): FormArray { return this.registroForm.get('telefonos') as FormArray; }
  get direcciones(): FormArray { return this.registroForm.get('direcciones') as FormArray; }

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

  agregarDireccion(datos?: Partial<DireccionPersistida>): void {
    this.direcciones.push(this.crearDireccionGroup(datos));
    this.coloniasPorDireccion.push(datos?.colonia ? [datos.colonia] : []);
    this.direccionesCargando.update(estados => [...estados, false]);
  }

  quitarDireccion(index: number): void {
    if (this.direcciones.length <= 1) return;
    this.direcciones.removeAt(index);
    this.coloniasPorDireccion.splice(index, 1);
    this.direccionesCargando.update(estados => estados.filter((_, i) => i !== index));
  }

  private cargarDirecciones(persona: { direcciones?: DireccionPersistida[]; direccion?: string; ciudad?: string }): void {
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
      this.agregarDireccion(this.convertirDireccionAntigua(persona.direccion ?? '', persona.ciudad ?? ''));
    }
    // Conserva la ubicacion guardada sin depender de una consulta externa al abrir.
  }

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
    if (errores?.['pattern']) return nombre.endsWith('.cp') || nombre === 'cp' ? 'Ingresa cinco dígitos.' : 'Ingresa diez dígitos.';
    return 'Revisa este campo.';
  }

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
  const direccionPrincipal = direcciones[0];
  const direccionFormateada = `${direccionPrincipal.calle} #${direccionPrincipal.numero}, Col. ${direccionPrincipal.colonia}, C.P. ${direccionPrincipal.codigoPostal}, ${direccionPrincipal.estado}`;

  const payload = {
    nombre: rawVal.nombre, apellido: rawVal.apellido, genero: rawVal.genero,
    fechaNacimiento: rawVal.fechaNacimiento, ocupacion: rawVal.ocupacion,
    correos: rawVal.correos, telefonos: rawVal.telefonos,
    direcciones,
    ciudad: direccionPrincipal.municipio,
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
