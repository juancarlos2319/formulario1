import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Usuario } from '../interfaces/usuario.interface';
import { ContactoEmergencia, Parentesco } from '../interfaces/contacto-emergencia.interface';

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  // Borrador en memoria: no se persiste hasta completar ambos pasos.
  borrador: Usuario | null = null;
  contactosBorrador: ContactoEmergencia[] = [];

  limpiarBorrador(): void {
    this.borrador = null;
    this.contactosBorrador = [];
  }

  guardarRegistroCompleto(contactos: ContactoEmergencia[]): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, { ...this.borrador, contactosEmergencia: contactos }, { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('guardar el registro y sus contactos')));
  }

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/formularios';

  // 1. Método auxiliar para adjuntar el token en cada petición
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // 2. Se inyecta { headers: this.getHeaders() } en todas las rutas protegidas

  obtenerContactos(id: number): Observable<ContactoEmergencia[]> {
    return this.http.get<ContactoEmergencia[]>(`${this.apiUrl}/${id}/contactos`, { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('obtener los contactos')));
  }

  guardarContactos(id: number, contactos: ContactoEmergencia[]): Observable<ContactoEmergencia[]> {
    return this.http.put<ContactoEmergencia[]>(`${this.apiUrl}/${id}/contactos`, contactos, { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('guardar los contactos')));
  }

  guardarFormulario(datos: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, datos, { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('guardar el formulario')));
  }

  obtenerFormularios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('obtener los formularios')));
  }

  obtenerPersonaPorId(id: number): Observable<Usuario | undefined> {
    return this.obtenerFormularios().pipe(
      map((personas) => personas.find((persona) => persona.id === id))
    );
  }

  actualizarFormulario(id: number, datos: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, datos, { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('actualizar el formulario')));
  }

  eliminarFormulario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('eliminar el formulario')));
  }

  obtenerOcupaciones(): Observable<string[]> {
    return this.http.get<string[]>('http://localhost:8080/api/ocupaciones', { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('obtener las ocupaciones')));
  }

  obtenerParentescos(): Observable<Parentesco[]> {
    return this.http.get<Parentesco[]>('http://localhost:8080/api/parentescos', { headers: this.getHeaders() })
      .pipe(catchError(this.manejarError('obtener los parentescos')));
  }

  private manejarError(operacion: string) {
    return (error: HttpErrorResponse) => {
      const detalle = typeof error.error === 'string' ? error.error : error.error?.message;
      const mensaje = detalle || `No se pudo ${operacion}. Codigo HTTP: ${error.status || 'sin respuesta'}.`;
      console.error(`RegistroService: fallo al ${operacion}.`, error);
      return throwError(() => new Error(mensaje));
    };
  }

}
