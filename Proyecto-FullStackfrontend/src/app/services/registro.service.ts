import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, ContactoDTO } from './usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/formularios';

  // --- CRUD MÉTODOS PRINCIPALES ---
  obtenerFormularios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  obtenerPersonaPorId(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  guardarFormulario(payload: any): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, payload);
  }

  actualizarFormulario(id: number, payload: any): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, payload);
  }

  eliminarFormulario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // --- MÉTODOS PARA CONTACTOS ---
  obtenerContactos(id: number): Observable<ContactoDTO[]> {
    return this.http.get<ContactoDTO[]>(`${this.apiUrl}/${id}/contactos`);
  }

  guardarContactos(id: number, contactos: ContactoDTO[]): Observable<ContactoDTO[]> {
    return this.http.put<ContactoDTO[]>(`${this.apiUrl}/${id}/contactos`, contactos);
  }

  // --- MÉTODOS AUXILIARES ---
  consultarCP(cp: string): Observable<any> {
    return this.http.get<any>(`https://api.copomex.com/query/info_cp/${cp}?token=pruebas`);
  }

  obtenerOcupaciones(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/ocupaciones');
  }
}