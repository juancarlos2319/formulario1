import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  constructor(private authService: AuthService, private router: Router) {}

  onLogin(): void {
  this.authService.login(this.credentials).subscribe({
    next: (res) => {
      console.log('1. Respuesta del backend:', res);
      console.log('2. Token guardado en localStorage:', localStorage.getItem('jwt_token'));

      this.router.navigate(['/dashboard']).then(navegado => {
        if (!navegado) {
          console.error('3. La navegación fue rechazada. Revisa si la ruta /dashboard existe o si un AuthGuard la bloqueó.');
        }
      });
    },
    error: (err) => {
      console.error('Error HTTP al intentar loguear:', err);
      this.errorMessage = 'Usuario o contraseña incorrectos.';
    }
  });
}
}
