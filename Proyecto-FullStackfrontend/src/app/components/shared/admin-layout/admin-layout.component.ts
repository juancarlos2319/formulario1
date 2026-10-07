import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UsuarioActual } from '../../../interfaces/usuario-actual.interface';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet, RouterLink } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, SidebarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  readonly usuarioActual = signal<UsuarioActual | null>(null);
  readonly cargandoCuenta = signal(true);
  readonly errorCuenta = signal(false);

  ngOnInit(): void {
    this.authService.obtenerUsuarioActual().pipe(
      finalize(() => this.cargandoCuenta.set(false))
    ).subscribe({
      next: usuario => this.usuarioActual.set(usuario),
      error: () => this.errorCuenta.set(true)
    });
  }


  private route = inject(ActivatedRoute);
  get titulo(): string {
    return this.route.firstChild?.snapshot.data['titulo'] ?? 'Administración';
  }
}
