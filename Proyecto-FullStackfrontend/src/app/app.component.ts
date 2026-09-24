import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.authService.tokenChanges$.subscribe(token => {
      if (!token && this.router.url !== '/' && this.router.url !== '/inicio') {
        this.router.navigate(['/inicio'], { replaceUrl: true });
      }
    });
  }
}
