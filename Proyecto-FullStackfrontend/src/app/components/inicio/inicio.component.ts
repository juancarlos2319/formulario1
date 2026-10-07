import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css'],
  animations: [
    trigger('entrada', [
      state('oculto', style({ opacity: 0, transform: 'translateY({{desplazamiento}})' }),
        { params: { desplazamiento: '10px' } }),
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('oculto => visible', [
        animate('{{duracion}}ms {{retraso}}ms cubic-bezier(0.2, 0, 0, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ], { params: { retraso: 0, duracion: 450, desplazamiento: '10px' } })
    ])
  ]
})
export class InicioComponent implements OnInit, OnDestroy {
  private temporizadorEntrada?: ReturnType<typeof setTimeout>;
  readonly movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  entradas = [0, 120, 240, 360, 480, 600, 720, 0, 120, 240, 360, 480, 600, 720, 840, 960]
    .map(retraso => this.configurarEntrada(retraso));

  private configurarEntrada(retraso: number) {
    return { value: 'oculto', params: {
      duracion: this.movimientoReducido ? 250 : 450,
      desplazamiento: this.movimientoReducido ? '0px' : '10px',
      retraso
    } };
  }
  credentials = { username: '', password: '' };
  errorMessage = '';
  showPassword = false;
  usuarioActivado = false;
  passwordActivado = false;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Inicia despues del primer render, tanto al recargar como al entrar por el router.
    this.temporizadorEntrada = setTimeout(() => {
      this.entradas = this.entradas.map(entrada => ({ ...entrada, value: 'visible' }));
    }, 150);
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorEntrada);
  }

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
