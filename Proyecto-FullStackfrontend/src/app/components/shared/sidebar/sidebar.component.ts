import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UsuarioActual } from '../../../interfaces/usuario-actual.interface';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/inicio'], { replaceUrl: true });
  }
}
