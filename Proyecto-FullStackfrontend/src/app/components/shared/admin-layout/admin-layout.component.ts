import { CommonModule } from '@angular/common';
import { finalize, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../services/auth.service';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet, RouterLink } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, SidebarComponent, MatSidenavModule, MatToolbarModule, MatButtonModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
  readonly esMovil = toSignal(inject(BreakpointObserver).observe('(max-width: 760px)').pipe(
    map(estado => estado.matches)
  ), { initialValue: window.matchMedia('(max-width: 760px)').matches });
  private authService = inject(AuthService);
  readonly usuarioActual = this.authService.usuarioActual;
  readonly cargandoCuenta = signal(true);
  readonly errorCuenta = signal(false);

  ngOnInit(): void {
    this.authService.obtenerUsuarioActual().pipe(
      finalize(() => this.cargandoCuenta.set(false))
    ).subscribe({
      error: () => this.errorCuenta.set(true)
    });
  }


  private route = inject(ActivatedRoute);
  get titulo(): string {
    return this.route.firstChild?.snapshot.data['titulo'] ?? 'Administración';
  }
}
