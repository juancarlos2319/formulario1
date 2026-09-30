import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { ContactoEmergencia } from '../../interfaces/contacto-emergencia.interface';

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

  personaId = 0;
  contactos: ContactoEmergencia[] = [];
  cargando = true;
  mensajeError = '';

  ngOnInit(): void {
    this.personaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarContactos();
  }

  cargarContactos(): void {
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

  obtenerIniciales(nombre = '', apellido = ''): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }
}
