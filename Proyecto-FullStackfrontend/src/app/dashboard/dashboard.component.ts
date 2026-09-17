import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RegistroService } from '../services/registro.service';
import { TarjetaUsuarioComponent } from './tarjeta-usuario/tarjeta-usuario.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TarjetaUsuarioComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  contactos: any[] = [];

  constructor(
    private registroService: RegistroService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarContactos();
  }

  cargarContactos(): void {
    const servicio: any = this.registroService;
    const metodoObtener = servicio.obtenerPersonas 
      ? servicio.obtenerPersonas() 
      : (servicio.obtenerUsuarios ? servicio.obtenerUsuarios() : servicio.obtenerContactos());

    metodoObtener.subscribe({
      next: (data: any) => (this.contactos = data),
      error: (err: any) => console.error('Error al cargar contactos:', err)
    });
  }

  editarContacto(contacto: any): void {
    if (contacto?.id) {
      this.router.navigate(['/registro', contacto.id]);
    }
  }

  borrarContacto(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      const servicio: any = this.registroService;
      const metodoEliminar = servicio.eliminarPersona 
        ? servicio.eliminarPersona(id) 
        : (servicio.eliminarUsuario ? servicio.eliminarUsuario(id) : servicio.eliminarContacto(id));

      metodoEliminar.subscribe({
        next: () => this.cargarContactos(),
        error: (err: any) => console.error('Error al eliminar:', err)
      });
    }
  }
}