import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ValidationErrors, FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, merge, of, debounceTime, map, tap, switchMap, catchError } from 'rxjs';
import { PersonasService } from '../../services/personas.service';
import { Resultado } from '../../interfaces/usuario.interface';
import { ContactoEmergencia, Parentesco } from '../../interfaces/contacto-emergencia.interface';
import { FeedbackService } from '../shared/feedback/feedback.service';

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contactos.component.html',
  styleUrls: ['../shared/admin-pages.css', './contactos.component.css']
})
export class ContactosComponent implements OnInit, OnDestroy {
  readonly guardando = signal(false);
  private destruido = false;
  private readonly revisionVerificaciones = signal(0);
  private confirmaciones = Promise.resolve();
  private verificaciones = new Map<FormGroup, { revision: number; pendiente: boolean; fallo: boolean; reutilizado: boolean; subscription: Subscription }>();

  get verificando(): boolean {
    this.revisionVerificaciones();
    return this.contactos.controls.some(control => this.verificaciones.get(control as FormGroup)?.pendiente);
  }

  get errorVerificacion(): boolean {
    this.revisionVerificaciones();
    return this.contactos.controls.some(control => this.verificaciones.get(control as FormGroup)?.fallo);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.verificaciones.forEach(estado => estado.subscription.unsubscribe());
  }
  contactosForm!: FormGroup;
  personaId = 0;
  contactoId: number | null = null;
  modoEdicion = false;
  modoAgregar = false;
  contactosOriginales: ContactoEmergencia[] = [];
  readonly cargandoContactos = signal(false);
  readonly contactosCargados = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');
  readonly parentescos = signal<Parentesco[]>([]);

  private fb = inject(FormBuilder);
  private registroService = inject(PersonasService);
  private feedbackService = inject(FeedbackService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    // Formulario dinámico inicializado
    this.contactosForm = this.fb.group({
      contactos: this.fb.array([])
    });
    this.cargarParentescos();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.personaId = Number(idParam);
      this.modoEdicion = this.route.snapshot.data['modoContactos'] === 'editar';
      this.modoAgregar = this.route.snapshot.data['modoContactos'] === 'agregar';
      const contactoId = this.route.snapshot.paramMap.get('contactoId');
      this.contactoId = contactoId === null ? null : Number(contactoId);
      this.cargarContactos();
    } else {
      if (!this.registroService.obtenerBorrador()) {
        this.mensajeError.set('Primero completa los datos de la persona registrada.');
        this.router.navigate(['/registro']);
        return;
      }
      this.agregarContacto();
    }
  }

  // Getter conveniente para iterar con ngFor en la plantilla HTML
  get contactos(): FormArray {
    return this.contactosForm.get('contactos') as FormArray;
  }

  numeroContacto(index: number): number {
    if (this.modoEdicion && index === 0) {
      const indiceOriginal = this.contactosOriginales.findIndex(contacto => contacto.idContacto === this.contactoId);
      if (indiceOriginal >= 0) return indiceOriginal + 1;
    }
    if (this.modoEdicion) return this.contactosOriginales.length + index;
    if (this.modoAgregar) return this.contactosOriginales.length + index + 1;
    return index + 1;
  }

  // Crea la estructura de un contacto
  crearContactoGroup(datos?: ContactoEmergencia): FormGroup {
    const nombre = datos?.nombre ?? '';
    const apellidos = this.descomponerApellidos(datos?.apellido ?? '');
    const grupo = this.fb.group({
      idContacto: [datos?.idContacto ?? null],
      nombres: [nombre, [Validators.required, Validators.maxLength(100)]],
      apellidoPaterno: [apellidos.paterno, [Validators.required, Validators.maxLength(100)]],
      apellidoMaterno: [apellidos.materno, [Validators.maxLength(100)]],
      nombre: [nombre, [Validators.required, Validators.maxLength(100)]],
      apellido: [this.combinarApellidos(apellidos.paterno, apellidos.materno), [Validators.required, Validators.maxLength(100)]],
      fechaNacimiento: [datos?.fechaNacimiento ?? '', Validators.required],
      genero: [datos?.genero ?? '', Validators.required],
      correos: this.fb.array((datos?.correos?.length ? datos.correos : ['']).map(valor => this.crearComunicacion('correos', valor)), [Validators.required, this.comunicacionesDistintas]),
      telefonos: this.fb.array((datos?.telefonos?.length ? datos.telefonos : ['']).map(valor => this.crearComunicacion('telefonos', valor)), [Validators.required, this.comunicacionesDistintas]),
      idParentesco: [datos?.idParentesco ?? null, Validators.required]
    });
    this.sincronizarAliasNombreContacto(grupo);
    return grupo;
  }

  comunicaciones(index: number, tipo: 'correos' | 'telefonos'): FormArray {
    return this.contactos.at(index).get(tipo) as FormArray;
  }

  private crearComunicacion(tipo: 'correos' | 'telefonos', valor = '') {
    return this.fb.control(valor, tipo === 'correos'
      ? [Validators.required, Validators.email, Validators.maxLength(150)]
      : [Validators.required, Validators.pattern('^[0-9]{10}$')]);
  }

  private comunicacionesDistintas(control: AbstractControl): ValidationErrors | null {
    const valores: string[] = (control.value ?? []).map((valor: string) => valor.trim().toLowerCase()).filter(Boolean);
    return new Set(valores).size === valores.length ? null : { repetidos: true };
  }

  agregarComunicacion(index: number, tipo: 'correos' | 'telefonos'): void {
    const array = this.comunicaciones(index, tipo);
    if (this.guardando() || array.disabled) return;
    array.push(this.crearComunicacion(tipo));
  }

  quitarComunicacion(index: number, tipo: 'correos' | 'telefonos', posicion: number): void {
    const array = this.comunicaciones(index, tipo);
    if (this.guardando() || array.disabled || array.length <= 1) return;
    array.removeAt(posicion);
  }

  campoInvalido(index: number, nombre: string): boolean {
    const campo = this.contactos.at(index).get(nombre);
    return !!campo && campo.invalid && (campo.touched || campo.dirty);
  }

  errorCampo(index: number, nombre: string): string {
    const errores = this.contactos.at(index).get(nombre)?.errors;
    if (errores?.['required']) return 'Este campo es obligatorio.';
    if (errores?.['maxlength']) return `No puede superar ${errores['maxlength'].requiredLength} caracteres.`;
    if (errores?.['email']) return 'Escribe un correo electrónico válido.';
    if (errores?.['pattern']) return 'Ingresa diez dígitos.';
    return 'Revisa este campo.';
  }

  private descomponerApellidos(apellido?: string): { paterno: string; materno: string } {
    const apellidos = (apellido ?? '').trim();
    const partes = apellidos.split(/\s+/).filter(Boolean);
    return {
      paterno: partes[0] ?? '',
      materno: partes.slice(1).join(' ')
    };
  }

  private combinarApellidos(apellidoPaterno: string, apellidoMaterno: string): string {
    return `${apellidoPaterno} ${apellidoMaterno}`.trim();
  }

  private sincronizarAliasNombreContacto(grupo: FormGroup): void {
    const actualizarDesdeNuevos = () => {
      const nombres = (grupo.get('nombres')?.value ?? '').trim();
      const paterno = (grupo.get('apellidoPaterno')?.value ?? '').trim();
      const materno = (grupo.get('apellidoMaterno')?.value ?? '').trim();
      const apellido = this.combinarApellidos(paterno, materno);
      if ((grupo.get('nombre')?.value ?? '') !== nombres) grupo.get('nombre')?.setValue(nombres, { emitEvent: false });
      if ((grupo.get('apellido')?.value ?? '') !== apellido) grupo.get('apellido')?.setValue(apellido, { emitEvent: false });
    };
    const actualizarDesdeLegacy = () => {
      const nombre = (grupo.get('nombre')?.value ?? '').trim();
      const apellido = (grupo.get('apellido')?.value ?? '').trim();
      const { paterno, materno } = this.descomponerApellidos(apellido);
      if ((grupo.get('nombres')?.value ?? '') !== nombre) grupo.get('nombres')?.setValue(nombre, { emitEvent: false });
      if ((grupo.get('apellidoPaterno')?.value ?? '') !== paterno) grupo.get('apellidoPaterno')?.setValue(paterno, { emitEvent: false });
      if ((grupo.get('apellidoMaterno')?.value ?? '') !== materno) grupo.get('apellidoMaterno')?.setValue(materno, { emitEvent: false });
    };

    ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'nombre', 'apellido'].forEach(controlName => {
      grupo.get(controlName)?.valueChanges.subscribe(() => {
        if (controlName === 'nombre' || controlName === 'apellido') {
          actualizarDesdeLegacy();
        } else {
          actualizarDesdeNuevos();
        }
      });
    });

    actualizarDesdeNuevos();
  }

  private convertirContactoLegacy(raw: any): ContactoEmergencia {
    const nombre = (raw?.nombres ?? raw?.nombre ?? '').trim();
    const apellido = this.combinarApellidos(raw?.apellidoPaterno ?? raw?.apellido ?? '', raw?.apellidoMaterno ?? '');
    const { nombres, apellidoPaterno, apellidoMaterno, ...resto } = raw ?? {};
    return {
      ...resto,
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      idParentesco: raw?.idParentesco ?? undefined
    };
  }

  // Botón para agregar N contactos sin límite
  agregarContacto(datos?: ContactoEmergencia): void {
    const grupo = this.crearContactoGroup(datos);
    this.contactos.push(grupo);
    this.observarCoincidencias(grupo);
  }

  private observarCoincidencias(grupo: FormGroup): void {
    const estado = { revision: 0, pendiente: false, fallo: false, reutilizado: false, subscription: new Subscription() };
    this.verificaciones.set(grupo, estado);
    let correosPrevios: string[] = grupo.get('correos')!.value;
    let telefonosPrevios: string[] = grupo.get('telefonos')!.value;
    estado.subscription = merge(
      grupo.get('correos')!.valueChanges.pipe(map((valores: string[]) => { const indice = Math.max(0, valores.findIndex((v, i) => v !== correosPrevios[i])); correosPrevios = [...valores]; return { campo: 'correos' as const, indice }; })),
      grupo.get('telefonos')!.valueChanges.pipe(map((valores: string[]) => { const indice = Math.max(0, valores.findIndex((v, i) => v !== telefonosPrevios[i])); telefonosPrevios = [...valores]; return { campo: 'telefonos' as const, indice }; }))
    ).pipe(
      tap(() => { estado.revision++; estado.pendiente = true; estado.fallo = false; this.revisionVerificaciones.update(v => v + 1); }),
      debounceTime(350),
      switchMap(({ campo, indice }) => {
        const revision = estado.revision;
        const datos = grupo.getRawValue();
        const consulta = {
          correos: (datos.correos as string[]).map(v => v.trim()).filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
          telefonos: (datos.telefonos as string[]).filter(v => /^[0-9]{10}$/.test(v)),
          excluirId: datos.idContacto ?? undefined
        };
        return (consulta.correos.length || consulta.telefonos.length ? this.registroService.buscarContactos(consulta) : of([])).pipe(
          map(coincidencias => ({ campo, indice, revision, coincidencias, fallo: false })),
          catchError(() => of({ campo, indice, revision, coincidencias: [] as ContactoEmergencia[], fallo: true }))
        );
      })
    ).subscribe(resultado => {
      this.confirmaciones = this.confirmaciones.then(async () => {
        const vigente = () => !this.destruido && this.contactos.controls.includes(grupo) && estado.revision === resultado.revision;
        if (!vigente()) return;
        try {
          if (resultado.fallo) { estado.fallo = true; return; }
          if (!resultado.coincidencias.length) return;
          if (resultado.coincidencias.length > 1) {
            this.feedbackService.notify('El correo y/o teléfono coinciden con varias personas. Revisa los datos antes de continuar.', 'warning');
            (grupo.get(resultado.campo) as FormArray).at(resultado.indice).setValue('', { emitEvent: false });
            (grupo.get(resultado.campo) as FormArray).at(resultado.indice).markAsTouched();
            estado.fallo = true;
            return;
          }
          const persona = resultado.coincidencias[0];
          const repetido = persona.idContacto === this.personaId ||
            this.contactosOriginales.some(c => c.idContacto === persona.idContacto && c.idContacto !== this.contactoId) ||
            this.contactos.controls.some(c => c !== grupo && c.get('idContacto')?.value === persona.idContacto);
          if (repetido) {
            this.feedbackService.notify('Esta persona ya está en la lista o es el titular. Selecciona otro contacto.', 'warning');
            (grupo.get(resultado.campo) as FormArray).at(resultado.indice).setValue('', { emitEvent: false });
            (grupo.get(resultado.campo) as FormArray).at(resultado.indice).markAsTouched();
            return;
          }
          const aceptar = await this.feedbackService.confirm({
            title: 'Persona ya registrada',
            message: `${persona.nombre} ${persona.apellido} ya está registrada en el sistema. ¿Deseas rellenar los campos con su información y usarla como contacto?`,
            confirmLabel: 'Rellenar campos'
          });
          if (!vigente()) return;
          if (aceptar) {
            const { idParentesco, parentesco, ...personales } = persona;
            const apellidos = this.descomponerApellidos(persona.apellido ?? '');
            for (const tipo of ['correos', 'telefonos'] as const) {
              const array = grupo.get(tipo) as FormArray;
              array.clear({ emitEvent: false });
              for (const valor of persona[tipo] ?? []) array.push(this.fb.control(valor), { emitEvent: false });
            }
            grupo.patchValue({
              ...personales,
              nombres: persona.nombre ?? '',
              apellidoPaterno: apellidos.paterno,
              apellidoMaterno: apellidos.materno,
            }, { emitEvent: false });
            estado.reutilizado = true;
            for (const campo of ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'fechaNacimiento', 'genero', 'correos', 'telefonos']) {
              grupo.get(campo)!.disable({ emitEvent: false });
            }
          } else {
            (grupo.get(resultado.campo) as FormArray).at(resultado.indice).setValue('', { emitEvent: false });
            (grupo.get(resultado.campo) as FormArray).at(resultado.indice).markAsTouched();
          }
        } finally {
          if (vigente()) { estado.pendiente = false; this.revisionVerificaciones.update(v => v + 1); }
        }
      });
    });
  }

  reintentarVerificacion(): void {
    this.contactos.controls.forEach(grupo => {
      if (this.verificaciones.get(grupo as FormGroup)?.fallo) grupo.get('correos')!.updateValueAndValidity();
    });
  }

  // Permite borrar dinámicamente si hay más de 1 contacto en pantalla
  eliminarContacto(index: number): void {
    if (this.modoEdicion && index === 0) return;
    if (this.contactos.length > 1) {
      const grupo = this.contactos.at(index) as FormGroup;
      this.verificaciones.get(grupo)?.subscription.unsubscribe();
      this.verificaciones.delete(grupo);
      this.contactos.removeAt(index);
    } else {
      this.feedbackService.notify('Debes mantener al menos un contacto en la lista.', 'warning');
    }
  }

  cargarContactos(): void {
    if (this.cargandoContactos()) return;
    this.cargandoContactos.set(true);
    this.contactosCargados.set(false);
    this.mensajeError.set('');
    this.registroService.obtenerContactos(this.personaId)
      .subscribe({
        next: (data) => {
          this.cargandoContactos.set(false);
          this.contactosOriginales = data ?? [];
          this.verificaciones.forEach(estado => estado.subscription.unsubscribe());
          this.verificaciones.clear();
          this.contactos.clear();
          if (this.modoEdicion) {
            const contacto = this.contactosOriginales.find(item => item.idContacto === this.contactoId);
            if (!contacto) {
              this.feedbackService.notify('No se encontró el vínculo que intentas editar.', 'error');
              this.router.navigate(['/contactos', this.personaId]);
              return;
            }
            this.agregarContacto(contacto);
          } else {
            this.agregarContacto();
          }
          this.contactosCargados.set(true);
        },
        error: (err) => {
          this.cargandoContactos.set(false);
          console.error('Error al cargar contactos:', err);
          this.mensajeError.set(err instanceof Error ? err.message : 'No se pudieron cargar los contactos.');
        }
      });
  }

  async guardarContactos(): Promise<void> {
    if (this.guardando() || this.verificando || this.errorVerificacion) return;
    if (this.cargandoContactos() || (this.personaId > 0 && !this.contactosCargados()) || this.contactos.length === 0) return;
    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (this.contactosForm.invalid) {
      this.mensajeError.set('Por favor completa todos los campos requeridos (*).');
      this.contactosForm.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    if (this.modoEdicion && !this.verificaciones.get(this.contactos.at(0) as FormGroup)?.reutilizado) {
      const contacto = this.convertirContactoLegacy(this.contactos.getRawValue()[0]);
      const confirmado = await this.feedbackService.confirm({
        title: 'Actualizar datos del contacto',
        message: `Los cambios de ${contacto.nombre} ${contacto.apellido} se aplicarán a todos los titulares que comparten este contacto. ¿Deseas continuar?`,
        confirmLabel: 'Actualizar contacto'
      });
      if (!confirmado) { this.guardando.set(false); return; }
    }

    const editados = this.contactos.controls.map(control => {
      const contacto = this.convertirContactoLegacy(control.getRawValue());
      return this.verificaciones.get(control as FormGroup)?.reutilizado
        ? { idContacto: contacto.idContacto, idParentesco: contacto.idParentesco }
        : contacto;
    });
    let payload: ContactoEmergencia[];
    if (this.modoEdicion) {
      const contactoActualizado = editados[0];
      payload = this.contactosOriginales.map(contacto => contacto.idContacto === this.contactoId
        ? contactoActualizado
        : { idContacto: contacto.idContacto, idParentesco: contacto.idParentesco });
      payload.push(...editados.slice(1));
    } else if (this.modoAgregar) {
      payload = [
        ...this.contactosOriginales.map(contacto => ({
          idContacto: contacto.idContacto,
          idParentesco: contacto.idParentesco
        })),
        ...editados
      ];
    } else {
      payload = editados;
    }

    const solicitud: Observable<Resultado> = this.personaId > 0
      ? this.registroService.guardarContactos(this.personaId, payload)
      : this.registroService.guardarRegistroCompleto(payload);

    solicitud
      .subscribe({
        next: () => {
          this.feedbackService.notify('Contactos guardados correctamente.', 'success');
          if (this.personaId === 0) this.registroService.limpiarBorrador();
          this.guardando.set(false);
          this.router.navigate(this.personaId > 0 ? ['/contactos', this.personaId] : ['/personas']);
        },
        error: (err) => {
          this.guardando.set(false);
          console.error('Error al guardar contactos:', err);
          this.mensajeError.set(err instanceof Error
            ? err.message
            : 'Ocurrio un error al guardar los contactos. Revisa los datos ingresados.');
        }
      });
  }

  cancelar(): void {
    if (this.personaId > 0) {
      this.router.navigate(['/contactos', this.personaId]);
    } else {
      this.router.navigate(['/registro']);
    }
  }

  private cargarParentescos(): void {
    this.registroService.obtenerParentescos().subscribe({
      next: (parentescos) => this.parentescos.set(parentescos),
      error: (err) => this.mensajeError.set(err instanceof Error ? err.message : 'No se pudieron cargar los parentescos.')
    });
  }
}
