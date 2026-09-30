import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
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
  private readonly registroService = inject(RegistroService);
  private readonly feedbackService = inject(FeedbackService);

  personaId = 0;
  contactos: ContactoEmergencia[] = [];
  cargando = true;
  mensajeError = '';
  quitando = false;

  ngOnInit(): void {
    this.personaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarContactos();
  }

  cargarContactos(): void {
    if (this.quitando) return;
    this.cargando = true;
    this.mensajeError = '';
    this.registroService.obtenerContactos(this.personaId).subscribe({
      next: contactos => {
        this.contactos = contactos;
        this.cargando = false;
      },
      error: () => {
        this.mensajeError = 'No se pudieron cargar los contactos. Intenta nuevamente.';
        this.cargando = false;
      }
    });
  }

  async quitarContacto(contacto: ContactoEmergencia): Promise<void> {
    if (this.cargando || this.quitando || this.mensajeError || this.contactos.length <= 1 ||
        contacto.idContacto == null || !this.contactos.some(item => item.idContacto === contacto.idContacto)) return;
    this.quitando = true;
    try {
      const confirmado = await this.feedbackService.confirm({
        title: 'Quitar contacto',
        message: `¿Deseas quitar a ${contacto.nombre} ${contacto.apellido} de esta lista? Si nadie más lo tiene como contacto y no tiene un registro propio, sus datos se eliminarán.`,
        confirmLabel: 'Quitar contacto',
        tone: 'danger'
      });
      if (!confirmado) return;
      const restantes = this.contactos
        .filter(item => item.idContacto !== contacto.idContacto)
        .map(item => ({ idContacto: item.idContacto, idParentesco: item.idParentesco }));
      this.contactos = await firstValueFrom(this.registroService.guardarContactos(this.personaId, restantes));
      this.feedbackService.notify('Contacto desvinculado correctamente.', 'success');
    } catch {
      this.mensajeError = 'No se pudo quitar el contacto. Recarga la lista antes de intentar nuevamente.';
    } finally {
      this.quitando = false;
    }
  }

  obtenerIniciales(nombre = '', apellido = ''): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }
}
