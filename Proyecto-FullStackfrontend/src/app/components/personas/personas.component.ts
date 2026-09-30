import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { Usuario } from '../../interfaces/usuario.interface';
import { FeedbackService } from '../shared/feedback/feedback.service';

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './personas.component.html',
  styleUrls: ['../shared/admin-pages.css', './personas.component.css']
})
export class PersonasComponent implements OnInit {
  private registroService = inject(RegistroService);
  private feedbackService = inject(FeedbackService);
  usuarios: Usuario[] = [];
  cargando = true;
  mensajeError = '';
  busqueda = '';
  eliminando: number | null = null;
  detalle: Usuario | null = null;

  get usuariosFiltrados(): Usuario[] {
    const texto = this.normalizar(this.busqueda.trim());
    return this.usuarios.filter(u => this.normalizar(
      [u.nombre, u.apellido, u.email, u.telefono, u.ocupacion, u.ciudad].join(' ')
    ).includes(texto));
  }

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  ngOnInit(): void { this.cargarUsuarios(); }

  cargarUsuarios(): void {
    this.detalle = null;
    this.cargando = true;
    this.mensajeError = '';
    this.registroService.obtenerFormularios().subscribe({
      next: data => { this.usuarios = data; this.cargando = false; },
      error: () => { this.mensajeError = 'No se pudieron cargar los registros. Intenta nuevamente.'; this.cargando = false; }
    });
  }

  async eliminar(id: number | undefined): Promise<void> {
    if (id == null || this.eliminando !== null) return;
    const persona = this.usuarios.find(usuario => usuario.id === id);
    const confirmada = await this.feedbackService.confirm({
      title: 'Dar de baja a esta persona',
      message: `¿Deseas dar de baja a ${persona?.nombre ?? 'esta persona'} ${persona?.apellido ?? ''}? Podrás reactivarla después.`,
      confirmLabel: 'Dar de baja',
      tone: 'danger'
    });
    if (!confirmada) return;
    this.eliminando = id;
    this.mensajeError = '';
    this.registroService.eliminarFormulario(id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(u => u.id !== id);
        if (this.detalle?.id === id) this.detalle = null;
        this.eliminando = null;
        this.feedbackService.notify('La persona fue dada de baja.', 'success');
      },
      error: () => { this.mensajeError = 'No se pudo eliminar a la persona. Intenta nuevamente.'; this.eliminando = null; }
    });
  }

  obtenerIniciales(nombre: string = '', apellido: string = ''): string {
    return ((nombre || '').charAt(0) + (apellido || '').charAt(0)).toUpperCase();
  }

}
