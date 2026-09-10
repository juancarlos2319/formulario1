import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { RegistroService } from '../services/registro.service';
import { Usuario } from '../services/usuario.interface';

// Importa directamente desde el subdirectorio hijo dentro de dashboard
import { TarjetaUsuarioComponent } from './tarjeta-usuario/tarjeta-usuario.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TarjetaUsuarioComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private registroService = inject(RegistroService);
  private router = inject(Router);
  contactos: Usuario[] = [];

  ngOnInit(): void {
    this.cargarContactos();
  }

  cargarContactos(): void {
    this.registroService.obtenerFormularios().subscribe({
      next: (data) => {
        this.contactos = data;
      },
      error: (err) => console.error('Error al cargar contactos:', err)
    });
  }

  borrarContacto(id?: number): void {
    if (!id) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      this.registroService.eliminarFormulario(id).subscribe({
        next: () => {
          alert('Registro eliminado correctamente.');
          this.cargarContactos();
        },
        error: (err) => console.error('Error al eliminar el registro:', err)
      });
    }
  }

  editarContacto(usuario: Usuario): void {
    this.router.navigate(['/registro'], { state: { usuarioParaEditar: usuario } });
  }
}