import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Sube dos niveles para salir de tarjeta-usuario y dashboard hasta llegar a services
import { Usuario } from '../../../interfaces/usuario.interface';

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

  /** Notifica al componente padre qué persona se quiere eliminar. */
  onEliminar(): void {
    if (this.usuario && this.usuario.id) {
      this.eliminar.emit(this.usuario.id);
    }
  }

  /** Entrega la persona seleccionada al componente padre para editarla. */
  onEditar(): void {
    this.editar.emit(this.usuario);
  }
}
