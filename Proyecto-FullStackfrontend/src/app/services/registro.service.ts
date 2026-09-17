import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from './usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/formularios';

  guardarFormulario(datos: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, datos);
  }

  obtenerFormularios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  actualizarFormulario(id: number, datos: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, datos);
  }

  eliminarFormulario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  obtenerOcupaciones(): Observable<string[]> {
  return this.http.get<string[]>('http://localhost:8080/api/ocupaciones');
  
  }
  consultarCP(cp: string): Observable<any> {
  return this.http.get(`https://www.correosmexico.com.mx/api/cp?cp=${cp}`);
  }
}