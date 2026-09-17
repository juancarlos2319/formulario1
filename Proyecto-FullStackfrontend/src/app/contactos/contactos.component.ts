import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RegistroService } from '../services/registro.service';

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './contactos.component.html',
  styleUrls: ['./contactos.component.css']
})
export class ContactosComponent implements OnInit {
  contactos: any[] = [];

  constructor(
    private registroService: RegistroService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarContactos();
  }

  cargarContactos(): void {
    // Si tu servicio usa un método distinto, usa obtenerUsuarios() o el que devuelva la lista
    const servicio: any = this.registroService;
    const metodoObtener = servicio.obtenerPersonas ? servicio.obtenerPersonas() : servicio.obtenerUsuarios();

    metodoObtener.subscribe({
      next: (data: any) => (this.contactos = data),
      error: (err: any) => console.error('Error al cargar contactos:', err)
    });
  }

  onEditar(contacto: any): void {
    if (contacto?.id) {
      this.router.navigate(['/registro', contacto.id]);
    }
  }

  onEliminar(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este contacto?')) {
      const servicio: any = this.registroService;
      const metodoEliminar = servicio.eliminarPersona ? servicio.eliminarPersona(id) : servicio.eliminarUsuario(id);

      metodoEliminar.subscribe({
        next: () => this.cargarContactos(),
        error: (err: any) => console.error('Error al eliminar:', err)
      });
    }
  }
}