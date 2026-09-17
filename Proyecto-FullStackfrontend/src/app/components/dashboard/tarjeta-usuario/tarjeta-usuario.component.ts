import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Sube dos niveles para salir de tarjeta-usuario y dashboard hasta llegar a services
import { Usuario } from '../../../services/usuario.interface';

@Component({
  selector: 'app-tarjeta-usuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarjeta-usuario.component.html',
  styleUrls: ['./tarjeta-usuario.component.css']
})
export class TarjetaUsuarioComponent {
  @Input() usuario!: Usuario;
  @Output() eliminar = new EventEmitter<number>();
  @Output() editar = new EventEmitter<Usuario>();

  onEliminar(): void {
    if (this.usuario && this.usuario.id) {
      this.eliminar.emit(this.usuario.id);
    }
  }

  onEditar(): void {
    this.editar.emit(this.usuario);
  }
}
