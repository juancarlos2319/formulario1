import { Injectable, inject, signal } from '@angular/core';
import { PersonasService } from './personas.service';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, shareReplay } from 'rxjs';
import { UsuarioActual } from '../interfaces/usuario-actual.interface';
import { Resultado } from '../interfaces/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly cuentaActual = signal<UsuarioActual | null>(null);
  readonly usuarioActual = this.cuentaActual.asReadonly();
  private consultaCuenta?: Observable<UsuarioActual>;
  private revisionCuenta = 0;
  private registroService = inject(PersonasService);
  private apiUrl = 'http://localhost:8080/api/auth';
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.readToken());
  readonly tokenChanges$ = this.tokenSubject.asObservable();
  private expirationTimer?: ReturnType<typeof setTimeout>;
  private readonly tokenMonitor = window.setInterval(() => this.detectExternalTokenChange(), 250);

  constructor(private http: HttpClient) {
    this.registroService.datosPersonalesActualizados$?.subscribe(() => {
      if (this.tokenSubject.value) {
        this.actualizarUsuarioActual().subscribe({ error: () => {} });
      }
    });
    window.addEventListener('storage', this.onStorageChange);
    this.scheduleExpiration(this.tokenSubject.value);
  }

  login(credentials: { username: string; password: string }): Observable<any> {
  return this.http.post<{ token: string; usuarioActual: UsuarioActual }>(`${this.apiUrl}/login`, credentials).pipe(
    tap(res => {
      if (res.token) {
        this.setToken(res.token);
        this.cuentaActual.set(res.usuarioActual);
      }
    })
  );
}

  obtenerUsuarioActual(): Observable<UsuarioActual> {
    const usuario = this.cuentaActual();
    if (usuario) return of(usuario);
    // Recupera una sesion previa una sola vez al recargar la aplicacion.
    if (!this.consultaCuenta) {
      return this.actualizarUsuarioActual();
    }
    return this.consultaCuenta;
  }

  actualizarUsuarioActual(): Observable<UsuarioActual> {
      const revision = ++this.revisionCuenta;
      const token = this.tokenSubject.value;
      this.consultaCuenta = this.http.get<UsuarioActual>(`${this.apiUrl}/me`).pipe(
        tap(cuenta => {
          if (revision === this.revisionCuenta && token === this.tokenSubject.value && token) this.cuentaActual.set(cuenta);
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    return this.consultaCuenta;
  }

  obtenerDatosLogin(): Observable<{ username: string }> {
    return this.http.get<{ username: string }>(`${this.apiUrl}/me/login`);
  }

  actualizarLogin(datos: { username: string; passwordActual: string; passwordNueva: string }): Observable<Resultado> {
    return this.http.put<Resultado>(`${this.apiUrl}/me/login`, datos);
  }

  logout(): void {
    this.registroService.limpiarBorrador();
    this.setToken(null);
  }

  isLoggedIn(): boolean {
    this.synchronizeToken();
    const token = this.tokenSubject.value;
    try {
      const payload = JSON.parse(atob((token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()) return true;
    } catch {}
    this.setToken(null);
    return false;
  }

  private readToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  private setToken(token: string | null): void {
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
    }
    this.publishToken(token);
  }

  private synchronizeToken(): void {
    const token = this.readToken();
    if (token !== this.tokenSubject.value) this.publishToken(token);
  }

  private publishToken(token: string | null): void {
    if (token && !this.hasValidStructure(token)) token = null;
    if (token === this.tokenSubject.value) return;
    this.cuentaActual.set(null);
    this.revisionCuenta++;
    this.consultaCuenta = undefined;
    this.tokenSubject.next(token);
    this.scheduleExpiration(token);
  }

  private hasValidStructure(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private scheduleExpiration(token: string | null): void {
    if (this.expirationTimer) clearTimeout(this.expirationTimer);
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const delay = payload.exp * 1000 - Date.now();
      if (typeof payload.exp !== 'number' || delay <= 0) {
        this.setToken(null);
        return;
      }
      this.expirationTimer = setTimeout(() => this.setToken(null), delay);
    } catch {
      this.setToken(null);
    }
  }

  private onStorageChange = (event: StorageEvent): void => {
    if (event.key === 'jwt_token' && event.newValue !== this.tokenSubject.value) {
      this.invalidateSession();
    }
  };

  private detectExternalTokenChange(): void {
    if (this.readToken() !== this.tokenSubject.value) {
      this.invalidateSession();
    }
  }

  private invalidateSession(): void {
    if (!this.tokenSubject.value && !this.readToken()) return;
    this.registroService.limpiarBorrador();
    localStorage.removeItem('jwt_token');
    this.publishToken(null);
  };
}
