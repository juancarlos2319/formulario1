import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { Usuario } from '../../interfaces/usuario.interface';
import { FeedbackService } from '../shared/feedback/feedback.service';

@Component({
  selector: 'app-personas-desactivadas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './personas-desactivadas.component.html',
  styleUrls: ['../shared/admin-pages.css', './personas-desactivadas.component.css']
})
export class PersonasDesactivadasComponent implements OnInit {
  private readonly registroService = inject(RegistroService);
  private readonly feedbackService = inject(FeedbackService);
  personas: Usuario[] = [];
  cargando = true;
  reactivando: number | null = null;
  mensajeError = '';

  ngOnInit(): void {
    this.cargarPersonas();
  }

  cargarPersonas(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.registroService.obtenerFormulariosInactivos().subscribe({
      next: personas => {
        this.personas = personas;
        this.cargando = false;
      },
      error: () => {
        this.mensajeError = 'No se pudieron cargar las personas desactivadas. Intenta nuevamente.';
        this.cargando = false;
      }
    });
  }

  async reactivar(persona: Usuario): Promise<void> {
    if (persona.id == null || this.reactivando !== null) return;
    const confirmada = await this.feedbackService.confirm({
      title: 'Reactivar persona',
      message: `¿Deseas reactivar a ${persona.nombre} ${persona.apellido}?`,
      confirmLabel: 'Reactivar'
    });
    if (!confirmada) return;

    this.reactivando = persona.id;
    this.mensajeError = '';
    this.registroService.reactivarFormulario(persona.id).subscribe({
      next: () => {
        this.personas = this.personas.filter(item => item.id !== persona.id);
        this.reactivando = null;
        this.feedbackService.notify(`${persona.nombre} ${persona.apellido} fue reactivada.`, 'success');
      },
      error: (error: unknown) => {
        this.mensajeError = error instanceof Error
          ? error.message
          : 'No se pudo reactivar a la persona. Intenta nuevamente.';
        this.reactivando = null;
      }
    });
  }

  obtenerIniciales(nombre: string = '', apellido: string = ''): string {
    return ((nombre || '').charAt(0) + (apellido || '').charAt(0)).toUpperCase();
  }
}
