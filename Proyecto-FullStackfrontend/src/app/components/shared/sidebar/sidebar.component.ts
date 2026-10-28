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
    imports: [NgIf, RouterLink, RouterLinkActive, MatListModule, MatButtonModule],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Output() readonly navegacion = new EventEmitter<void>();
  private authService = inject(AuthService);
  private router = inject(Router);
  /** Mantiene la URL del menú sincronizada con la navegación completada. */
  private readonly urlActual = toSignal(this.router.events.pipe(
    filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
    map(evento => evento.urlAfterRedirects),
    startWith(this.router.url)
  ), { requireSync: true });

  /** Identifica el titular en edición para mostrar su acceso contextual. */
  readonly personaEditadaId = computed(() => {
    const segmentos = this.router.parseUrl(this.urlActual()).root.children[PRIMARY_OUTLET]?.segments ?? [];
    return segmentos.length === 2 && segmentos[0].path === 'registro'
      ? segmentos[1].path : null;
  });

  /** Determina si debe marcarse el apartado de personas desactivadas. */
  readonly vistaPersonasDesactivadas = computed(() => {
    const segmentos = this.router.parseUrl(this.urlActual()).root.children[PRIMARY_OUTLET]?.segments ?? [];
    return segmentos.length === 2 && segmentos[0].path === 'personas' && segmentos[1].path === 'desactivadas';
  });

  /** Identifica el titular de la lista, alta o edición de contactos activa. */
  readonly personaContactadaId = computed(() => {
    const segmentos = this.router.parseUrl(this.urlActual()).root.children[PRIMARY_OUTLET]?.segments ?? [];
    if (segmentos[0]?.path !== 'contactos' || !/^\d+$/.test(segmentos[1]?.path ?? '')) return null;
    const rutaLista = segmentos.length === 2;
    const rutaAgregar = segmentos.length === 3 && segmentos[2].path === 'agregar';
    const rutaEditar = segmentos.length === 4 && segmentos[2].path === 'editar' && /^\d+$/.test(segmentos[3].path);
    return rutaLista || rutaAgregar || rutaEditar ? segmentos[1].path : null;
  });

  /** Extrae los IDs del titular y del contacto que se está editando. */
  readonly contactoEditado = computed(() => {
    const segmentos = this.router.parseUrl(this.urlActual()).root.children[PRIMARY_OUTLET]?.segments ?? [];
    if (segmentos.length !== 4 || segmentos[0].path !== 'contactos' || segmentos[2].path !== 'editar' ||
        !/^\d+$/.test(segmentos[1].path) || !/^\d+$/.test(segmentos[3].path)) return null;
    return { personaId: segmentos[1].path, contactoId: segmentos[3].path };
  });

  /** Detecta a qué titular se le está agregando un contacto. */
  readonly personaAgregandoContactoId = computed(() => {
    const segmentos = this.router.parseUrl(this.urlActual()).root.children[PRIMARY_OUTLET]?.segments ?? [];
    return segmentos.length === 3 && segmentos[0].path === 'contactos' && segmentos[2].path === 'agregar' && /^\d+$/.test(segmentos[1].path)
      ? segmentos[1].path : null;
  });

  /** Cierra el menú y la sesión antes de volver al login. */
  logout(): void {
    this.navegacion.emit();
    this.authService.logout();
    this.router.navigate(['/inicio'], { replaceUrl: true });
  }
}
