import { DOCUMENT } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-nav.component.html',
  styleUrls: ['./dashboard-nav.component.css']
})
export class DashboardNavComponent {
  private document = inject(DOCUMENT);

  verPersonas(event: Event): void {
    event.preventDefault();
    const listado = this.document.getElementById('personas');
    if (listado) listado.scrollIntoView({ block: 'start' });
    else this.router.navigate(['/dashboard']);
  }

  @Input() total: number | null = null;
  private authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/inicio'], { replaceUrl: true });
  }
}
