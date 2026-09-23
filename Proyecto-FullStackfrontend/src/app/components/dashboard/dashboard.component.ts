import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { Usuario } from '../../services/usuario.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['../shared/admin-pages.css', './dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private registroService = inject(RegistroService);
  usuarios: Usuario[] = [];
  cargando = true;
  mensajeError = '';
  readonly fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

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

  ngOnInit(): void { this.cargarUsuarios(); }

  cargarUsuarios(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.registroService.obtenerFormularios().subscribe({
      next: data => { this.usuarios = data; this.cargando = false; },
      error: () => { this.mensajeError = 'No se pudieron cargar los registros. Intenta nuevamente.'; this.cargando = false; }
    });
  }


}
