import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, catchError, throwError, finalize, shareReplay, tap } from 'rxjs';
import { Usuario, PersonaDetalle, PersonaResumen, Resultado, Resumen } from '../interfaces/usuario.interface';
import { ContactoEmergencia, Parentesco } from '../interfaces/contacto-emergencia.interface';

@Injectable({
  providedIn: 'root'
})
export class PersonasService {
  private readonly cambiosPersonales = new Subject<void>();
  readonly datosPersonalesActualizados$ = this.cambiosPersonales.asObservable();
  private readonly borradorKey = 'registro_borrador';
  // Borrador en memoria: no se persiste hasta completar ambos pasos.
  borrador: Usuario | null = null;
  contactosBorrador: ContactoEmergencia[] = [];

  limpiarBorrador(): void {
    this.borrador = null;
    this.contactosBorrador = [];
    sessionStorage.removeItem(this.borradorKey);
  }

  limpiarCacheSesion(): void {
    this.personasCache.clear();
    this.contactosCache.clear();
    this.parentescosCache = undefined;
    this.solicitudes.clear();
  }

  guardarBorrador(datos: Usuario): void {
    this.borrador = datos;
    sessionStorage.setItem(this.borradorKey, JSON.stringify(datos));
  }

  obtenerBorrador(): Usuario | null {
    if (this.borrador) return this.borrador;
    const almacenado = sessionStorage.getItem(this.borradorKey);
    if (!almacenado) return null;
    try {
      this.borrador = JSON.parse(almacenado) as Usuario;
      return this.borrador;
    } catch {
      sessionStorage.removeItem(this.borradorKey);
      return null;
    }
  }

  guardarRegistroCompleto(contactos: ContactoEmergencia[]): Observable<Resultado> {
    const borrador = this.obtenerBorrador();
    if (!borrador) {
      return throwError(() => new Error('Primero completa los datos de la persona registrada.'));
    }
    return this.http.post<Resultado>(this.apiUrl, { ...borrador, contactosEmergencia: contactos }, { headers: this.getHeaders() })
      .pipe(tap(r => { if (r.ok) this.invalidarPersonas(); }), catchError(this.manejarError('guardar el registro y sus contactos')));
  }

  private http = inject(HttpClient);
  private personasCache = new Map<string, Observable<unknown>>();
  private solicitudes = new Map<string, Observable<unknown>>();
  private parentescosCache?: Observable<Parentesco[]>;
  private contactosCache = new Map<number, { respuesta: Observable<ContactoEmergencia[]>; expira: number }>();
  private apiUrl = 'http://localhost:8080/api/personas';

  // 1. Método auxiliar para adjuntar el token en cada petición
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // 2. Se inyecta { headers: this.getHeaders() } en todas las rutas protegidas

  obtenerContactos(id: number): Observable<ContactoEmergencia[]> {
    const cache = this.contactosCache.get(id);
    if (cache && cache.expira > Date.now()) return cache.respuesta;

    const respuesta = this.http.get<ContactoEmergencia[]>(`${this.apiUrl}/${id}/contactos`, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        this.contactosCache.delete(id);
        return this.manejarError('obtener los contactos')(error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.contactosCache.set(id, { respuesta, expira: Date.now() + 30_000 });
    return respuesta;
  }

  buscarContactos(datos: { correos?: string[]; telefonos?: string[]; excluirId?: number }): Observable<ContactoEmergencia[]> {
    return this.http.post<ContactoEmergencia[]>(`${this.apiUrl}/contactos/coincidencias`, datos, { headers: this.getHeaders() })
      .pipe(catchError(() => throwError(() => new Error('No se pudo verificar si el contacto ya existe. Reintenta la consulta.'))));
  }

  guardarContactos(id: number, contactos: ContactoEmergencia[]): Observable<Resultado> {
    return this.http.put<Resultado>(`${this.apiUrl}/${id}/contactos`, contactos, { headers: this.getHeaders() })
      .pipe(tap(resultado => {
        if (resultado.ok) {
          // La persona editada puede estar compartida por otros titulares.
          this.invalidarPersonas();
          this.contactosCache.clear();
          this.cambiosPersonales.next();
        }
      }),
        catchError(this.manejarError('guardar los contactos')));
  }

  crearPersona(datos: Usuario): Observable<Resultado> {
    return this.http.post<Resultado>(this.apiUrl, datos, { headers: this.getHeaders() })
      .pipe(tap(r => { if (r.ok) this.invalidarPersonas(); }), catchError(this.manejarError('guardar el formulario')));
  }

  obtenerPersonas(): Observable<PersonaResumen[]> {
    return this.consultarPersonasCache<PersonaResumen[]>(this.apiUrl, 'obtener los formularios');
  }

  obtenerPersonasInactivas(): Observable<PersonaResumen[]> {
    return this.consultarPersonasCache<PersonaResumen[]>(`${this.apiUrl}/inactivos`, 'obtener las personas desactivadas');
  }

  reactivarPersona(id: number): Observable<Resultado> {
    return this.http.put<Resultado>(`${this.apiUrl}/${id}/reactivar`, null, { headers: this.getHeaders() })
      .pipe(tap(r => { if (r.ok) this.invalidarPersonas(); }), catchError(this.manejarError('reactivar la persona')));
  }

  obtenerDetallePersona(id: number): Observable<PersonaDetalle> {
    return this.consultarPersonasCache<PersonaDetalle>(`${this.apiUrl}/${id}/detalles`, 'obtener los detalles');
  }

  private invalidarPersonas(): void {
    this.personasCache.clear();
  }

  private consultarPersonasCache<T>(url: string, operacion: string): Observable<T> {
    const existente = this.personasCache.get(url);
    if (existente) return existente as Observable<T>;
    const respuesta = this.http.get<T>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        if (this.personasCache.get(url) === respuesta) this.personasCache.delete(url);
        return this.manejarError(operacion)(error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.personasCache.set(url, respuesta);
    return respuesta;
  }

  obtenerPersonaPorId(id: number): Observable<Usuario> {
    return this.consultarCompartido<Usuario>(`${this.apiUrl}/${id}`, 'obtener la persona');
  }

  actualizarPersona(id: number, datos: Usuario): Observable<Resultado> {
    return this.http.put<Resultado>(`${this.apiUrl}/${id}`, datos, { headers: this.getHeaders() })
      .pipe(tap(resultado => {
        if (resultado.ok) {
          this.invalidarPersonas();
          this.contactosCache.clear();
          this.cambiosPersonales.next();
        }
      }),
        catchError(this.manejarError('actualizar el formulario')));
  }

  eliminarPersona(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(tap(() => this.invalidarPersonas()), catchError(this.manejarError('eliminar el formulario')));
  }

  obtenerOcupaciones(): Observable<string[]> {
    return this.consultarCompartido<string[]>('http://localhost:8080/api/ocupaciones', 'obtener las ocupaciones');
  }

  obtenerParentescos(): Observable<Parentesco[]> {
    if (!this.parentescosCache) {
      this.parentescosCache = this.http.get<Parentesco[]>('http://localhost:8080/api/parentescos', { headers: this.getHeaders() }).pipe(
        catchError(error => {
          this.parentescosCache = undefined;
          return this.manejarError('obtener los parentescos')(error);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.parentescosCache;
  }

  obtenerResumen(): Observable<Resumen> {
    return this.consultarCompartido<Resumen>(`${this.apiUrl}/resumen`, 'obtener el resumen');
  }

  private consultarCompartido<T>(url: string, operacion: string): Observable<T> {
    const pendiente = this.solicitudes.get(url);
    if (pendiente) return pendiente as Observable<T>;
    const solicitud = this.http.get<T>(url, { headers: this.getHeaders() }).pipe(
      catchError(this.manejarError(operacion)),
      finalize(() => this.solicitudes.delete(url)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.solicitudes.set(url, solicitud);
    return solicitud;
  }

  private manejarError(operacion: string) {
    return (error: HttpErrorResponse) => {
      const detalle = typeof error.error === 'string' ? error.error : error.error?.message;
      const mensaje = detalle || `No se pudo ${operacion}. Codigo HTTP: ${error.status || 'sin respuesta'}.`;
      console.error(`PersonasService: fallo al ${operacion}.`, error);
      return throwError(() => new Error(mensaje));
    };
  }

}
