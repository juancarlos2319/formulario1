import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RegistroService } from '../services/registro.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private registroService = inject(RegistroService);

  isEditing = false;
  contactoId: number | null = null;

  contacto: any = {
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    genero: '',
    ocupacion: '',
    ciudad: '',
    direccion: '',
    contactoEmergenciaNombre: '',
    contactoEmergenciaTelefono: '',
    contactoEmergenciaParentesco: ''
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditing = true;
      this.contactoId = Number(idParam);
      this.cargarContacto(this.contactoId);
    }
  }

  cargarContacto(id: number): void {
    const servicio: any = this.registroService;
    const metodoObtener = servicio.obtenerContactoPorId 
      ? servicio.obtenerContactoPorId(id) 
      : (servicio.obtenerPersonaPorId ? servicio.obtenerPersonaPorId(id) : servicio.obtenerUsuarioPorId(id));

    if (metodoObtener) {
      metodoObtener.subscribe({
        next: (data: any) => {
          if (data) this.contacto = { ...data };
        },
        error: (err: any) => console.error('Error al cargar registro:', err)
      });
    }
  }

  onSubmit(): void {
    const servicio: any = this.registroService;

    if (this.isEditing && this.contactoId) {
      const metodoActualizar = servicio.actualizarPersona 
        ? servicio.actualizarPersona(this.contactoId, this.contacto) 
        : (servicio.actualizarUsuario ? servicio.actualizarUsuario(this.contactoId, this.contacto) : servicio.actualizarContacto(this.contactoId, this.contacto));

      if (metodoActualizar) {
        metodoActualizar.subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: () => this.router.navigate(['/dashboard'])
        });
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      const metodoGuardar = servicio.guardarPersona 
        ? servicio.guardarPersona(this.contacto) 
        : (servicio.agregarUsuario ? servicio.agregarUsuario(this.contacto) : servicio.guardarContacto(this.contacto));

      if (metodoGuardar) {
        metodoGuardar.subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: () => this.router.navigate(['/dashboard'])
        });
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }

  cancelar(): void {
    this.router.navigate(['/dashboard']);
  }
}