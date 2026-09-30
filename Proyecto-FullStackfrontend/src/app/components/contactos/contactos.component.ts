import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, merge, of, debounceTime, map, tap, switchMap, catchError } from 'rxjs';
import { RegistroService } from '../../services/registro.service';
import { Usuario } from '../../interfaces/usuario.interface';
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
  guardando = false;
  private destruido = false;
  private confirmaciones = Promise.resolve();
  private verificaciones = new Map<FormGroup, { revision: number; pendiente: boolean; fallo: boolean; reutilizado: boolean; subscription: Subscription }>();

  get verificando(): boolean {
    return this.contactos.controls.some(control => this.verificaciones.get(control as FormGroup)?.pendiente);
  }

  get errorVerificacion(): boolean {
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
  cargandoContactos = false;
  contactosCargados = false;
  mensajeError: string = '';
  mensajeExito: string = '';
  parentescos: Parentesco[] = [];

  private fb = inject(FormBuilder);
  private registroService = inject(RegistroService);
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
        this.mensajeError = 'Primero completa los datos de la persona registrada.';
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
    return this.fb.group({
      idContacto: [datos?.idContacto ?? null],
      nombre: [datos?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
      apellido: [datos?.apellido ?? '', [Validators.required, Validators.maxLength(100)]],
      fechaNacimiento: [datos?.fechaNacimiento ?? '', Validators.required],
      genero: [datos?.genero ?? '', Validators.required],
      email: [datos?.email ?? '', [Validators.required, Validators.email]],
      telefono: [datos?.telefono ?? '', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      idParentesco: [datos?.idParentesco ?? null, Validators.required]
    });
  }

  campoInvalido(index: number, nombre: string): boolean {
    const campo = this.contactos.at(index).get(nombre);
    return !!campo && campo.invalid && (campo.touched || campo.dirty);
  }

  errorCampo(index: number, nombre: string): string {
    const errores = this.contactos.at(index).get(nombre)?.errors;
    if (errores?.['required']) return 'Este campo es obligatorio.';
    if (errores?.['maxlength']) return 'No puede superar 100 caracteres.';
    if (errores?.['email']) return 'Escribe un correo electrónico válido.';
    if (errores?.['pattern']) return 'Ingresa diez dígitos.';
    return 'Revisa este campo.';
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
    estado.subscription = merge(
      grupo.get('email')!.valueChanges.pipe(map(() => 'email' as const)),
      grupo.get('telefono')!.valueChanges.pipe(map(() => 'telefono' as const))
    ).pipe(
      tap(() => { estado.revision++; estado.pendiente = true; estado.fallo = false; }),
      debounceTime(350),
      switchMap(campo => {
        const revision = estado.revision;
        const datos = grupo.getRawValue();
        const email = String(datos.email ?? '').trim();
        const telefono = String(datos.telefono ?? '').trim();
        const consulta = {
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
          telefono: /^[0-9]{10}$/.test(telefono) ? telefono : undefined,
          excluirId: datos.idContacto ?? undefined
        };
        return (consulta.email || consulta.telefono ? this.registroService.buscarContactos(consulta) : of([])).pipe(
          map(coincidencias => ({ campo, revision, coincidencias, fallo: false })),
          catchError(() => of({ campo, revision, coincidencias: [] as ContactoEmergencia[], fallo: true }))
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
            grupo.get(resultado.campo)!.setValue('', { emitEvent: false });
            grupo.get(resultado.campo)!.markAsTouched();
            // Obliga a consultar de nuevo el otro dato si todavía existe una coincidencia.
            estado.fallo = true;
            return;
          }
          const persona = resultado.coincidencias[0];
          const repetido = persona.idContacto === this.personaId ||
            this.contactosOriginales.some(c => c.idContacto === persona.idContacto && c.idContacto !== this.contactoId) ||
            this.contactos.controls.some(c => c !== grupo && c.get('idContacto')?.value === persona.idContacto);
          if (repetido) {
            this.feedbackService.notify('Esta persona ya está en la lista o es el titular. Selecciona otro contacto.', 'warning');
            grupo.get(resultado.campo)!.setValue('', { emitEvent: false });
            grupo.get(resultado.campo)!.markAsTouched();
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
            grupo.patchValue(personales, { emitEvent: false });
            estado.reutilizado = true;
            for (const campo of ['nombre', 'apellido', 'fechaNacimiento', 'genero', 'email', 'telefono']) {
              grupo.get(campo)!.disable({ emitEvent: false });
            }
          } else {
            grupo.get(resultado.campo)!.setValue('', { emitEvent: false });
            grupo.get(resultado.campo)!.markAsTouched();
          }
        } finally {
          if (vigente()) estado.pendiente = false;
        }
      });
    });
  }

  reintentarVerificacion(): void {
    this.contactos.controls.forEach(grupo => {
      if (this.verificaciones.get(grupo as FormGroup)?.fallo) grupo.get('email')!.updateValueAndValidity();
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
    if (this.cargandoContactos) return;
    this.cargandoContactos = true;
    this.contactosCargados = false;
    this.mensajeError = '';
    this.registroService.obtenerContactos(this.personaId)
      .subscribe({
        next: (data) => {
          this.cargandoContactos = false;
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
          this.contactosCargados = true;
        },
        error: (err) => {
          this.cargandoContactos = false;
          console.error('Error al cargar contactos:', err);
          this.mensajeError = err instanceof Error ? err.message : 'No se pudieron cargar los contactos.';
        }
      });
  }

  async guardarContactos(): Promise<void> {
    if (this.guardando || this.verificando || this.errorVerificacion) return;
    if (this.cargandoContactos || (this.personaId > 0 && !this.contactosCargados) || this.contactos.length === 0) return;
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.contactosForm.invalid) {
      this.mensajeError = 'Por favor completa todos los campos requeridos (*).';
      this.contactosForm.markAllAsTouched();
      return;
    }

    this.guardando = true;
    if (this.modoEdicion && !this.verificaciones.get(this.contactos.at(0) as FormGroup)?.reutilizado) {
      const contacto = this.contactos.getRawValue()[0] as ContactoEmergencia;
      const confirmado = await this.feedbackService.confirm({
        title: 'Actualizar datos del contacto',
        message: `Los cambios de ${contacto.nombre} ${contacto.apellido} se aplicarán a todos los titulares que comparten este contacto. ¿Deseas continuar?`,
        confirmLabel: 'Actualizar contacto'
      });
      if (!confirmado) { this.guardando = false; return; }
    }

    const editados = this.contactos.controls.map(control => {
      const contacto = control.getRawValue() as ContactoEmergencia;
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

    const solicitud: Observable<ContactoEmergencia[] | Usuario> = this.personaId > 0
      ? this.registroService.guardarContactos(this.personaId, payload)
      : this.registroService.guardarRegistroCompleto(payload);

    solicitud
      .subscribe({
        next: () => {
          this.feedbackService.notify('Contactos guardados correctamente.', 'success');
          if (this.personaId === 0) this.registroService.limpiarBorrador();
          this.guardando = false;
          this.router.navigate(this.personaId > 0 ? ['/contactos', this.personaId] : ['/personas']);
        },
        error: (err) => {
          this.guardando = false;
          console.error('Error al guardar contactos:', err);
          this.mensajeError = err instanceof Error
            ? err.message
            : 'Ocurrio un error al guardar los contactos. Revisa los datos ingresados.';
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
      next: (parentescos) => this.parentescos = parentescos,
      error: (err) => this.mensajeError = err instanceof Error ? err.message : 'No se pudieron cargar los parentescos.'
    });
  }
}
