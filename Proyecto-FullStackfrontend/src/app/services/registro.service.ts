import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Usuario } from './usuario.interface';

export interface ContactoEmergencia {
  nombre: string;
  telefono: string;
  parentesco: string;
}

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
    return this.http.post<Usuario>(this.apiUrl, { ...this.borrador, contactosEmergencia: contactos }, { headers: this.getHeaders() });
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
    return this.http.get<ContactoEmergencia[]>(`${this.apiUrl}/${id}/contactos`, { headers: this.getHeaders() });
  }

  guardarContactos(id: number, contactos: ContactoEmergencia[]): Observable<ContactoEmergencia[]> {
    return this.http.put<ContactoEmergencia[]>(`${this.apiUrl}/${id}/contactos`, contactos, { headers: this.getHeaders() });
  }

  guardarFormulario(datos: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, datos, { headers: this.getHeaders() });
  }

  obtenerFormularios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  obtenerPersonaPorId(id: number): Observable<Usuario | undefined> {
    return this.obtenerFormularios().pipe(
      map((personas) => personas.find((persona) => persona.id === id))
    );
  }

  actualizarFormulario(id: number, datos: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, datos, { headers: this.getHeaders() });
  }

  eliminarFormulario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  obtenerOcupaciones(): Observable<string[]> {
    return this.http.get<string[]>('http://localhost:8080/api/ocupaciones', { headers: this.getHeaders() });
  }

  // API Externa: Esta NO lleva token por seguridad y compatibilidad de CORS
  consultarCP(cp: string): Observable<any> {
    return this.http.get(`https://www.correosmexico.com.mx/api/cp?cp=${cp}`);
  }
}
