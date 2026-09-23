import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { DashboardNavComponent } from './dashboard-nav.component';
import { Usuario } from '../../services/usuario.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardNavComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private document = inject(DOCUMENT);

  verPersonas(event: Event): void {
    event.preventDefault();
    this.document.getElementById('personas')?.scrollIntoView({ block: 'start' });
  }

  private registroService = inject(RegistroService);
  usuarios: Usuario[] = [];
  cargando = true;
  mensajeError = '';
  busqueda = '';
  eliminando: number | null = null;
  detalle: Usuario | null = null;
  readonly fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  get usuariosFiltrados(): Usuario[] {
    const texto = this.normalizar(this.busqueda.trim());
    return this.usuarios.filter(u => this.normalizar(
      [u.nombre, u.apellido, u.email, u.telefono, u.ocupacion, u.ciudad].join(' ')
    ).includes(texto));
  }

  get conEmail(): number { return this.usuarios.filter(u => u.email?.trim()).length; }
  get conTelefono(): number { return this.usuarios.filter(u => u.telefono?.trim()).length; }
  get lugaresDisponibles(): number { return Math.max(0, 20 - this.usuarios.length); }

  get ocupaciones(): { nombre: string; cantidad: number; porcentaje: number }[] {
    const grupos = new Map<string, number>();
    this.usuarios.forEach(u => {
      const nombre = u.ocupacion?.trim() || 'Sin ocupación';
      grupos.set(nombre, (grupos.get(nombre) || 0) + 1);
    });
    return Array.from(grupos, ([nombre, cantidad]) => ({
      nombre, cantidad, porcentaje: this.usuarios.length ? cantidad / this.usuarios.length * 100 : 0
    })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  }

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  ngOnInit(): void { this.cargarUsuarios(); }

  cargarUsuarios(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.registroService.obtenerFormularios().subscribe({
      next: data => { this.usuarios = data; this.cargando = false; },
      error: () => { this.mensajeError = 'No se pudieron cargar los registros. Intenta nuevamente.'; this.cargando = false; }
    });
  }

  eliminar(id: number | undefined): void {
    if (id == null || this.eliminando !== null) return;
    if (!confirm('¿Estás seguro de que deseas dar de baja a esta persona?')) return;
    this.eliminando = id;
    this.mensajeError = '';
    this.registroService.eliminarFormulario(id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(u => u.id !== id);
        if (this.detalle?.id === id) this.detalle = null;
        this.eliminando = null;
      },
      error: () => { this.mensajeError = 'No se pudo eliminar a la persona. Intenta nuevamente.'; this.eliminando = null; }
    });
  }

  obtenerIniciales(nombre: string = '', apellido: string = ''): string {
    return ((nombre || '').charAt(0) + (apellido || '').charAt(0)).toUpperCase();
  }

}
