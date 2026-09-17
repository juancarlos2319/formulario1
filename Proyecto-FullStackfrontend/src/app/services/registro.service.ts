import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  private personasIniciales = [
    {
      id: 1,
      nombre: 'Carlos',
      apellidoPaterno: 'Gómez',
      apellidoMaterno: '',
      ocupacion: 'Administrador del Sistema',
      email: 'carlos.admin@sistema.com',
      telefono: '7711234567',
      ciudad: 'Pachuca',
      direccion: 'Av. Revolución #101',
      genero: 'Masculino',
      fechaNacimiento: '1990-03-15',
      contactoEmergenciaNombre: 'Soporte TI',
      contactoEmergenciaTelefono: '7710000001',
      contactoEmergenciaParentesco: 'Empresa'
    },
    {
      id: 2,
      nombre: 'Laura',
      apellidoPaterno: 'Martínez',
      apellidoMaterno: '',
      ocupacion: 'Administrador del Sistema',
      email: 'laura.admin@sistema.com',
      telefono: '7719876543',
      ciudad: 'Pachuca',
      direccion: 'Calle Allende #202',
      genero: 'Femenino',
      fechaNacimiento: '1993-08-22',
      contactoEmergenciaNombre: 'Soporte TI',
      contactoEmergenciaTelefono: '7710000002',
      contactoEmergenciaParentesco: 'Empresa'
    }
  ];

  private personasSubject = new BehaviorSubject<any[]>(this.personasIniciales);

  // --- LECTURA ---
  obtenerPersonas(): Observable<any[]> {
    return this.personasSubject.asObservable();
  }

  obtenerUsuarios(): Observable<any[]> {
    return this.obtenerPersonas();
  }

  obtenerContactos(): Observable<any[]> {
    return this.obtenerPersonas();
  }

  obtenerContactoPorId(id: number): Observable<any> {
    const lista = this.personasSubject.getValue();
    const encontrado = lista.find(p => Number(p.id) === Number(id));
    return of(encontrado);
  }

  obtenerPersonaPorId(id: number): Observable<any> {
    return this.obtenerContactoPorId(id);
  }

  obtenerUsuarioPorId(id: number): Observable<any> {
    return this.obtenerContactoPorId(id);
  }

  // --- ACTUALIZACIÓN ---
  actualizarPersona(id: number, datosActualizados: any): Observable<boolean> {
    const listaActual = this.personasSubject.getValue();
    const index = listaActual.findIndex(p => Number(p.id) === Number(id));
    
    if (index !== -1) {
      listaActual[index] = { ...listaActual[index], ...datosActualizados, id: Number(id) };
      this.personasSubject.next([...listaActual]);
    }
    return of(true);
  }

  actualizarUsuario(id: number, datos: any): Observable<boolean> {
    return this.actualizarPersona(id, datos);
  }

  actualizarContacto(id: number, datos: any): Observable<boolean> {
    return this.actualizarPersona(id, datos);
  }

  // --- CREACIÓN ---
  guardarPersona(persona: any): Observable<boolean> {
    const listaActual = this.personasSubject.getValue();
    const nuevoId = listaActual.length > 0 ? Math.max(...listaActual.map(p => p.id)) + 1 : 1;
    const nuevaPersona = { ...persona, id: nuevoId };
    
    this.personasSubject.next([...listaActual, nuevaPersona]);
    return of(true);
  }

  guardarContacto(persona: any): Observable<boolean> {
    return this.guardarPersona(persona);
  }

  agregarUsuario(persona: any): Observable<boolean> {
    return this.guardarPersona(persona);
  }

  // --- ELIMINACIÓN ---
  eliminarPersona(id: number): Observable<boolean> {
    const listaActual = this.personasSubject.getValue();
    const nuevaLista = listaActual.filter(p => Number(p.id) !== Number(id));
    this.personasSubject.next(nuevaLista);
    return of(true);
  }

  eliminarUsuario(id: number): Observable<boolean> {
    return this.eliminarPersona(id);
  }

  eliminarContacto(id: number): Observable<boolean> {
    return this.eliminarPersona(id);
  }
}