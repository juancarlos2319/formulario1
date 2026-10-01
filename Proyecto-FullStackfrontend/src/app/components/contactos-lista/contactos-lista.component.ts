import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PersonasService } from '../../services/personas.service';
import { ContactoEmergencia } from '../../interfaces/contacto-emergencia.interface';
import { FeedbackService } from '../shared/feedback/feedback.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-contactos-lista',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './contactos-lista.component.html',
  styleUrls: ['../shared/admin-pages.css', './contactos-lista.component.css']
})
export class ContactosListaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly registroService = inject(PersonasService);
  private readonly feedbackService = inject(FeedbackService);

  personaId = 0;
  readonly contactos = signal<ContactoEmergencia[]>([]);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');
  readonly quitando = signal(false);

  ngOnInit(): void {
    this.personaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarContactos();
  }

  cargarContactos(): void {
    if (this.quitando()) return;
    this.cargando.set(true);
    this.mensajeError.set('');
    this.registroService.obtenerContactos(this.personaId).subscribe({
      next: contactos => {
        this.contactos.set(contactos);
        this.cargando.set(false);
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los contactos. Intenta nuevamente.');
        this.cargando.set(false);
      }
    });
  }

  async quitarContacto(contacto: ContactoEmergencia): Promise<void> {
    if (this.cargando() || this.quitando() || this.mensajeError() || this.contactos().length <= 1 ||
        contacto.idContacto == null || !this.contactos().some(item => item.idContacto === contacto.idContacto)) return;
    this.quitando.set(true);
    try {
      const confirmado = await this.feedbackService.confirm({
        title: 'Quitar contacto',
        message: `¿Deseas quitar a ${contacto.nombre} ${contacto.apellido} de esta lista? Si nadie más lo tiene como contacto y no tiene un registro propio, sus datos se eliminarán.`,
        confirmLabel: 'Quitar contacto',
        tone: 'danger'
      });
      if (!confirmado) return;
      const restantes = this.contactos()
        .filter(item => item.idContacto !== contacto.idContacto)
        .map(item => ({ idContacto: item.idContacto, idParentesco: item.idParentesco }));
      await firstValueFrom(this.registroService.guardarContactos(this.personaId, restantes));
      this.contactos.set(this.contactos().filter(item => item.idContacto !== contacto.idContacto));
      this.feedbackService.notify('Contacto desvinculado correctamente.', 'success');
    } catch {
      this.mensajeError.set('No se pudo quitar el contacto. Recarga la lista antes de intentar nuevamente.');
    } finally {
      this.quitando.set(false);
    }
  }

  obtenerIniciales(nombre = '', apellido = ''): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }
}
