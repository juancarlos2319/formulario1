import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RegistroService } from '../services/registro.service';
import { Usuario } from '../services/usuario.interface';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit {
  public router = inject(Router);
  private registroService = inject(RegistroService);

  esEdicion = false;

  usuario: Usuario = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    genero: '',
    direccion: '',
    ciudad: '',
    ocupacion: '',
    contactoEmergenciaNombre: '',
    contactoEmergenciaTelefono: '',
    contactoEmergenciaParentesco: ''
  };

  ngOnInit(): void {
    const state = history.state;
    if (state && state.usuarioParaEditar) {
      this.esEdicion = true;
      this.usuario = { ...state.usuarioParaEditar };
    }
  }

  onSubmit(): void {
    if (this.usuario.fechaNacimiento && this.usuario.fechaNacimiento.includes('/')) {
      const partes = this.usuario.fechaNacimiento.split('/');
      if (partes.length === 3) {
        this.usuario.fechaNacimiento = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }
    }

    this.usuario.aceptaTerminos = true;

    if (this.esEdicion && this.usuario.id) {
      this.registroService.actualizarFormulario(this.usuario.id, this.usuario).subscribe({
        next: () => {
          alert('¡Usuario actualizado con éxito!');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => console.error('Error al actualizar:', err)
      });
    } else {
      this.registroService.guardarFormulario(this.usuario).subscribe({
        next: () => {
          alert('¡Usuario registrado con éxito!');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => console.error('Error al registrar:', err)
      });
    }
  }
}