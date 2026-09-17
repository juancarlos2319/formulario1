import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tarjeta-usuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarjeta-usuario.component.html',
  styleUrls: ['./tarjeta-usuario.component.css']
})
export class TarjetaUsuarioComponent {
  @Input() usuario: any;
  @Output() eliminar = new EventEmitter<number>();

  onEditarClick(): void {
    const id = this.usuario?.id ?? 1;
    window.location.href = `/registro/${id}`;
  }

  onEliminarClick(): void {
    if (this.usuario?.id) {
      this.eliminar.emit(this.usuario.id);
    }
  }
}