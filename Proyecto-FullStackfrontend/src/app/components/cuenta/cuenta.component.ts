import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { FeedbackService } from '../shared/feedback/feedback.service';

@Component({
  selector: 'app-cuenta', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cuenta.component.html', styleUrl: './cuenta.component.css'
})
export class CuentaComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private feedback = inject(FeedbackService);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly formulario = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(255), Validators.pattern(/^\S+$/)]],
    passwordActual: ['', Validators.required],
    passwordNueva: ['', Validators.minLength(8)],
    confirmarPassword: ['']
  }, { validators: grupo => {
    const nueva = grupo.get('passwordNueva')?.value || '';
    if (new TextEncoder().encode(nueva).length > 72) return { passwordLarga: true };
    return nueva === grupo.get('confirmarPassword')?.value ? null : { passwordsDistintas: true };
  }});

  ngOnInit(): void {
    this.auth.obtenerDatosLogin().pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: datos => this.formulario.controls.username.setValue(datos.username),
      error: () => this.error.set('No se pudieron cargar los datos de la cuenta. Recarga la página para reintentar.')
    });
  }

  guardar(): void {
    if (this.cargando() || this.guardando()) return;
    if (this.formulario.invalid) { this.formulario.markAllAsTouched(); return; }
    this.error.set('');
    this.guardando.set(true);
    const { username, passwordActual, passwordNueva } = this.formulario.getRawValue();
    this.auth.actualizarLogin({ username, passwordActual, passwordNueva }).pipe(
      finalize(() => this.guardando.set(false))
    ).subscribe({
      next: resultado => {
        if (resultado?.ok !== true) {
          this.error.set('El servidor no confirmó el guardado de la cuenta.');
          return;
        }
        this.formulario.reset();
        this.auth.logout();
        this.feedback.notify('Cuenta actualizada. Inicia sesión con tus datos nuevos.', 'success');
        this.router.navigate(['/inicio'], { replaceUrl: true });
      },
      error: err => this.error.set(err.status === 409 ? 'Ese nombre de usuario ya está registrado.'
        : err.status === 400 ? 'Revisa la contraseña actual y los datos ingresados.'
        : err.status === 403 ? 'El servidor rechazó el cambio. Comprueba que el backend esté actualizado y reiniciado.'
        : 'No se pudo actualizar la cuenta. Intenta nuevamente.')
    });
  }
}
