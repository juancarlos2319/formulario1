import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent {
  credentials = { username: '', password: '' };
  errorMessage = '';
  showPassword = false;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

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
