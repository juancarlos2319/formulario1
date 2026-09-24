import { Injectable, inject } from '@angular/core';
import { RegistroService } from './registro.service';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private registroService = inject(RegistroService);
  private apiUrl = 'http://localhost:8080/api/auth';
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.readToken());
  readonly tokenChanges$ = this.tokenSubject.asObservable();
  private expirationTimer?: ReturnType<typeof setTimeout>;
  private readonly tokenMonitor = window.setInterval(() => this.detectExternalTokenChange(), 250);

  constructor(private http: HttpClient) {
    window.addEventListener('storage', this.onStorageChange);
    this.scheduleExpiration(this.tokenSubject.value);
  }

  login(credentials: { username: string; password: string }): Observable<any> {
  return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
    tap(res => {
      if (res.token) {
        this.setToken(res.token);
      }
    })
  );
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
