import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PersonasService } from '../../services/personas.service';
import { Resumen } from '../../interfaces/usuario.interface';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatListModule, MatProgressBarModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['../shared/admin-pages.css', './dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private registroService = inject(PersonasService);
  readonly resumen = signal<Resumen>({ total: 0, conCorreo: 0, conTelefono: 0, ocupaciones: [] });
  readonly cargando = signal(true);
  readonly mensajeError = signal('');
  readonly fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  get conEmail(): number { return this.resumen().conCorreo; }
  get conTelefono(): number { return this.resumen().conTelefono; }
  get lugaresDisponibles(): number { return Math.max(0, 20 - this.resumen().total); }
  get ocupaciones(): { nombre: string; cantidad: number; porcentaje: number }[] {
    const resumen = this.resumen();
    return resumen.ocupaciones.map(grupo => ({ ...grupo, porcentaje: resumen.total ? grupo.cantidad / resumen.total * 100 : 0 }));
  }

  ngOnInit(): void { this.cargarUsuarios(); }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.registroService.obtenerResumen().subscribe({
      next: data => { this.resumen.set(data); this.cargando.set(false); },
      error: () => { this.mensajeError.set('No se pudo cargar el resumen. Intenta nuevamente.'); this.cargando.set(false); }
    });
  }


}
