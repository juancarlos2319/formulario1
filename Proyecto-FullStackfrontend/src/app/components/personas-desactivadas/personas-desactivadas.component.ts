import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PersonasService } from '../../services/personas.service';
import { PersonaResumen } from '../../interfaces/usuario.interface';
import { FeedbackService } from '../shared/feedback/feedback.service';

@Component({
  selector: 'app-personas-desactivadas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './personas-desactivadas.component.html',
  styleUrls: ['../shared/admin-pages.css', './personas-desactivadas.component.css']
})
export class PersonasDesactivadasComponent implements OnInit {
  private readonly registroService = inject(PersonasService);
  private readonly feedbackService = inject(FeedbackService);
  readonly personas = signal<PersonaResumen[]>([]);
  readonly cargando = signal(true);
  readonly reactivando = signal<number | null>(null);
  readonly mensajeError = signal('');

  ngOnInit(): void {
    this.cargarPersonas();
  }

  cargarPersonas(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.registroService.obtenerPersonasInactivas().subscribe({
      next: personas => {
        this.personas.set(personas);
        this.cargando.set(false);
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar las personas desactivadas. Intenta nuevamente.');
        this.cargando.set(false);
      }
    });
  }

  async reactivar(persona: PersonaResumen): Promise<void> {
    if (persona.id == null || this.reactivando() !== null) return;
    const confirmada = await this.feedbackService.confirm({
      title: 'Reactivar persona',
      message: `¿Deseas reactivar a ${persona.nombre} ${persona.apellido}?`,
      confirmLabel: 'Reactivar'
    });
    if (!confirmada) return;

    this.reactivando.set(persona.id);
    this.mensajeError.set('');
    this.registroService.reactivarPersona(persona.id).subscribe({
      next: () => {
        this.personas.set(this.personas().filter(item => item.id !== persona.id));
        this.reactivando.set(null);
        this.feedbackService.notify(`${persona.nombre} ${persona.apellido} fue reactivada.`, 'success');
      },
      error: (error: unknown) => {
        this.mensajeError.set(error instanceof Error
          ? error.message
          : 'No se pudo reactivar a la persona. Intenta nuevamente.');
        this.reactivando.set(null);
      }
    });
  }

  obtenerIniciales(nombre: string = '', apellido: string = ''): string {
    return ((nombre || '').charAt(0) + (apellido || '').charAt(0)).toUpperCase();
  }
}
