import { Component, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-inicio',
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
    templateUrl: './inicio.component.html',
    styleUrls: ['./inicio.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class InicioComponent {
  readonly movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly retrasosEntrada = [0, 120, 240, 360, 480, 600, 720, 0, 120, 240, 360, 480, 600, 720, 840, 960];
  readonly duracionEntrada = this.movimientoReducido ? 250 : 450;
  credentials = { username: '', password: '' };
  errorMessage = '';
  showPassword = false;
  usuarioActivado = false;
  passwordActivado = false;
  isLoading = false;

  /** function Object() { [native code] } */
  constructor(private authService: AuthService, private router: Router) {}

  /** Valida las credenciales básicas, inicia sesión y navega al dashboard. */
  onLogin(): void {
    if (this.isLoading || !this.credentials.username.trim() || !this.credentials.password) return;
    this.errorMessage = '';
    this.isLoading = true;
    this.authService.login(this.credentials).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']).then(navigated => {
          if (!navigated) this.errorMessage = 'No se pudo acceder al panel. Intenta iniciar sesión nuevamente.';
        }).catch(() => {
          this.errorMessage = 'No se pudo abrir el panel. Intenta nuevamente.';
        });
      },
      error: (err) => {
        this.errorMessage = err.status === 0
          ? 'No se pudo conectar con el servidor. Intenta nuevamente en unos momentos.'
          : err.status === 401 || err.status === 403
            ? 'Usuario o contraseña incorrectos.'
            : 'No se pudo iniciar sesión. Intenta nuevamente.';
      }
    });
  }
}
