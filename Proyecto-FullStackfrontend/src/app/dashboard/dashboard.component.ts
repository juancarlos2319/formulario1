import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RegistroService } from '../services/registro.service';
import { Usuario } from '../services/usuario.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private registroService = inject(RegistroService);

  usuarios: Usuario[] = [];
  cargando = true;
  mensajeError = '';

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.registroService.obtenerFormularios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.cargando = false;
      },
      error: () => {
        this.mensajeError = 'Error al cargar el listado de registros.';
        this.cargando = false;
      }
    });
  }

  eliminar(id: number | undefined): void {
    if (!id) return;
    if (confirm('¿Estás seguro de que deseas dar de baja a esta persona?')) {
      this.registroService.eliminarFormulario(id).subscribe({
        next: () => this.cargarUsuarios(),
        error: () => alert('No se pudo completar la eliminación.')
      });
    }
  }

  obtenerIniciales(nombre: string = '', apellido: string = ''): string {
    const n = nombre ? nombre.charAt(0) : '';
    const a = apellido ? apellido.charAt(0) : '';
    return (n + a).toUpperCase();
  }
}