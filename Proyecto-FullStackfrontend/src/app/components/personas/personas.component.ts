import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PersonasService } from '../../services/personas.service';
import { PersonaDetalle, PersonaResumen } from '../../interfaces/usuario.interface';
import { FeedbackService } from '../shared/feedback/feedback.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

@Component({
    selector: 'app-personas',
    imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatTableModule],
    templateUrl: './personas.component.html',
    styleUrls: ['../shared/admin-pages.css', './personas.component.css']
})
export class PersonasComponent implements OnInit {
  private registroService = inject(PersonasService);
  private feedbackService = inject(FeedbackService);
  readonly usuarios = signal<PersonaResumen[]>([]);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');
  readonly busqueda = signal('');
  readonly eliminando = signal<number | null>(null);
  readonly detalle = signal<PersonaDetalle | null>(null);
  readonly detalleId = signal<number | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly columnas = ['persona', 'telefono', 'ocupacion', 'ciudad', 'acciones'];
  readonly columnaDetalle = ['detalle'];

  /** Indica a la tabla qué persona tiene abierta la fila de detalles. */
  esFilaDetalle = (_indice: number, persona: PersonaResumen): boolean => this.detalleId() === persona.id;

  /** Filtra los datos descargados mediante la búsqueda normalizada. */
  get usuariosFiltrados(): PersonaResumen[] {
    const texto = this.normalizar(this.busqueda().trim());
    return this.usuarios().filter(u => this.normalizar(
      [u.nombre, u.apellido, ...u.correos, ...u.telefonos, u.ocupacion, ...(u.direcciones ?? []).map(d => d.municipio)].join(' ')
    ).includes(texto));
  }

  /** Elimina acentos y diferencias de mayúsculas para comparar búsquedas. */
  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /** Prepara la pantalla y solicita los datos iniciales necesarios. */
  ngOnInit(): void { this.cargarUsuarios(); }

  /** Obtiene el resumen de personas y actualiza carga, errores y detalle visible. */
  cargarUsuarios(): void {
    this.detalle.set(null);
    this.cargando.set(true);
    this.mensajeError.set('');
    this.registroService.obtenerPersonas().subscribe({
      next: data => { this.usuarios.set(data); this.cargando.set(false); },
      error: () => { this.mensajeError.set('No se pudieron cargar los registros. Intenta nuevamente.'); this.cargando.set(false); }
    });
  }

  /** Abre o cierra detalles y solo aplica respuestas de la persona seleccionada. */
  verDetalle(persona: PersonaResumen): void {
    if (persona.id == null) return;
    if (this.detalleId() === persona.id) { this.detalleId.set(null); this.detalle.set(null); return; }
    const id = persona.id;
    this.detalleId.set(id);
    this.detalle.set(null);
    this.cargandoDetalle.set(true);
    this.registroService.obtenerDetallePersona(id).subscribe({
      next: datos => { if (this.detalleId() === id) { this.detalle.set(datos); this.cargandoDetalle.set(false); } },
      error: () => { if (this.detalleId() === id) { this.cargandoDetalle.set(false); this.mensajeError.set('No se pudieron cargar los detalles.'); } }
    });
  }

  /** Confirma una baja permitida y retira la persona del listado si se completa. */
  async eliminar(id: number | undefined): Promise<void> {
    if (id == null || this.eliminando() !== null) return;
    const persona = this.usuarios().find(usuario => usuario.id === id);
    if (persona?.puedeEliminar !== true) return;
    const confirmada = await this.feedbackService.confirm({
      title: 'Dar de baja a esta persona',
      message: `¿Deseas dar de baja a ${persona?.nombre ?? 'esta persona'} ${persona?.apellido ?? ''}? Podrás reactivarla después.`,
      confirmLabel: 'Dar de baja',
      tone: 'danger'
    });
    if (!confirmada) return;
    this.eliminando.set(id);
    this.mensajeError.set('');
    this.registroService.eliminarPersona(id).subscribe({
      next: () => {
        this.usuarios.set(this.usuarios().filter(u => u.id !== id));
        if (this.detalleId() === id) { this.detalle.set(null); this.detalleId.set(null); }
        this.eliminando.set(null);
        this.feedbackService.notify('La persona fue dada de baja.', 'success');
      },
      error: () => { this.mensajeError.set('No se pudo eliminar a la persona. Intenta nuevamente.'); this.eliminando.set(null); }
    });
  }

  /** Forma las iniciales del nombre y apellido para mostrarlas en el avatar. */
  obtenerIniciales(nombre: string = '', apellido: string = ''): string {
    return ((nombre || '').charAt(0) + (apellido || '').charAt(0)).toUpperCase();
  }

}
