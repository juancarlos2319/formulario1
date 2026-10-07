import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, PRIMARY_OUTLET, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgIf, RouterLink, RouterLinkActive, MatListModule, MatButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Output() readonly navegacion = new EventEmitter<void>();
  private authService = inject(AuthService);
  private router = inject(Router);
  private readonly urlActual = toSignal(this.router.events.pipe(
    filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
    map(evento => evento.urlAfterRedirects),
    startWith(this.router.url)
  ), { requireSync: true });

  readonly personaEditadaId = computed(() => {
    const segmentos = this.router.parseUrl(this.urlActual()).root.children[PRIMARY_OUTLET]?.segments ?? [];
    return segmentos.length === 2 && segmentos[0].path === 'registro'
      ? segmentos[1].path : null;
  });

  logout(): void {
    this.navegacion.emit();
    this.authService.logout();
    this.router.navigate(['/inicio'], { replaceUrl: true });
  }
}
