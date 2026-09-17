import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  obtenerContactos(id: number): Observable<ContactoEmergencia[]> {
    return this.http.get<ContactoEmergencia[]>(this.apiUrl + '/' + id + '/contactos');
  }

  guardarContactos(id: number, contactos: ContactoEmergencia[]): Observable<ContactoEmergencia[]> {
    return this.http.put<ContactoEmergencia[]>(this.apiUrl + '/' + id + '/contactos', contactos);
  }
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/formularios';

  guardarFormulario(datos: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, datos);
  }

  obtenerFormularios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  obtenerPersonaPorId(id: number): Observable<Usuario | undefined> {
    return this.obtenerFormularios().pipe(
      map((personas) => personas.find((persona) => persona.id === id))
    );
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
