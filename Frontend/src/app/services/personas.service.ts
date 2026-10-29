import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject, catchError, throwError, finalize, map, shareReplay, tap } from 'rxjs';
import { Usuario, CambioPersona, PersonaDetalle, PersonaResumen, Resultado, Resumen } from '../interfaces/usuario.interface';
import { ContactoEmergencia, Parentesco } from '../interfaces/contacto-emergencia.interface';

@Injectable({
  providedIn: 'root'
})
export class PersonasService {
  private readonly cambiosPersonales = new Subject<CambioPersona>();
  private revisionSesion = 0;
  readonly datosPersonalesActualizados$ = this.cambiosPersonales.asObservable();
  private readonly borradorKey = 'registro_borrador';
  // El borrador usa memoria/sessionStorage; el alta en la base espera a los contactos.
  borrador: Usuario | null = null;
  contactosBorrador: ContactoEmergencia[] = [];

  /** Borra el alta pendiente de memoria y sessionStorage. */
  limpiarBorrador(): void {
    this.borrador = null;
    this.contactosBorrador = [];
    sessionStorage.removeItem(this.borradorKey);
  }

  /** Descarta respuestas y consultas compartidas al cambiar de sesión. */
  limpiarCacheSesion(): void {
    this.revisionSesion++;
    this.formularios.clear();
    this.personasCache.clear();
    this.filasActualizadas.clear();
    this.detallesActualizados.clear();
    this.contactosCache.clear();
    this.parentescosCache = undefined;
    this.solicitudes.clear();
  }

  /** Conserva los datos del titular hasta completar sus contactos. */
  guardarBorrador(datos: Usuario): void {
    this.borrador = datos;
    sessionStorage.setItem(this.borradorKey, JSON.stringify(datos));
  }

  /** Recupera el borrador y descarta los datos almacenados si su JSON es inválido. */
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

  /** Guarda titular y contactos juntos e invalida los listados tras la confirmación. */
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
  private detallesActualizados = new Map<number, Partial<PersonaDetalle>>();
  private formularios = new Map<number, Usuario>();
  private filasActualizadas = new Map<number, Partial<PersonaResumen>>();
  private solicitudes = new Map<string, Observable<unknown>>();
  private parentescosCache?: Observable<Parentesco[]>;
  private contactosCache = new Map<number, { respuesta: Observable<ContactoEmergencia[]>; expira: number }>();
  private apiUrl = 'http://localhost:8080/api/personas';

  /** Construye la cabecera Bearer con el token guardado. */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /** Reutiliza los contactos durante 30 segundos o consulta el backend. */
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

  /** Busca coincidencias por comunicaciones antes de reutilizar un contacto. */
  buscarContactos(datos: { correos?: string[]; telefonos?: string[]; excluirId?: number }): Observable<ContactoEmergencia[]> {
    return this.http.post<ContactoEmergencia[]>(`${this.apiUrl}/contactos/coincidencias`, datos, { headers: this.getHeaders() })
      .pipe(catchError(() => throwError(() => new Error('No se pudo verificar si el contacto ya existe. Reintenta la consulta.'))));
  }

  /** Sustituye los vínculos, invalida cachés y notifica que debe actualizarse el perfil. */
  guardarContactos(id: number, contactos: ContactoEmergencia[]): Observable<Resultado> {
    const revision = this.revisionSesion;
    return this.http.put<Resultado>(`${this.apiUrl}/${id}/contactos`, contactos, { headers: this.getHeaders() })
      .pipe(tap(resultado => {
        if (resultado.ok && revision === this.revisionSesion) {
          // La persona editada puede estar compartida por otros titulares.
          this.invalidarPersonas();
          this.contactosCache.clear();
          for (const contacto of contactos) {
            if (contacto.idContacto != null && contacto.nombre != null) {
              this.cambiosPersonales.next({
                id: contacto.idContacto, nombre: contacto.nombre, apellido: contacto.apellido,
                correos: contacto.correos, datosPersistidos: false
              });
            }
          }
        }
      }),
        catchError(this.manejarError('guardar los contactos')));
  }

  /** Envía el titular e invalida los listados cuando el backend confirma. */
  crearPersona(datos: Usuario): Observable<Resultado> {
    return this.http.post<Resultado>(this.apiUrl, datos, { headers: this.getHeaders() })
      .pipe(tap(r => { if (r.ok) this.invalidarPersonas(); }), catchError(this.manejarError('guardar el formulario')));
  }

  /** Obtiene el listado resumido de activos usando la caché en memoria. */
  obtenerPersonas(): Observable<PersonaResumen[]> {
    return this.consultarPersonasCache<PersonaResumen[]>(this.apiUrl, 'obtener los formularios')
      .pipe(map(filas => this.aplicarFilasActualizadas(filas)));
  }

  /** Obtiene el listado de bajas usando su entrada independiente en caché. */
  obtenerPersonasInactivas(): Observable<PersonaResumen[]> {
    return this.consultarPersonasCache<PersonaResumen[]>(`${this.apiUrl}/inactivos`, 'obtener las personas desactivadas')
      .pipe(map(filas => this.aplicarFilasActualizadas(filas)));
  }

  /** Solicita la reactivación y descarta los listados anteriores tras confirmarse. */
  reactivarPersona(id: number): Observable<Resultado> {
    return this.http.put<Resultado>(`${this.apiUrl}/${id}/reactivar`, null, { headers: this.getHeaders() })
      .pipe(tap(r => { if (r.ok) this.invalidarPersonas(); }), catchError(this.manejarError('reactivar la persona')));
  }

  /** Carga solo los datos adicionales y los conserva en memoria. */
  obtenerDetallePersona(id: number): Observable<PersonaDetalle> {
    return this.consultarPersonasCache<PersonaDetalle>(`${this.apiUrl}/${id}/detalles`, 'obtener los detalles').pipe(
      map(detalle => ({ ...detalle, ...this.detallesActualizados.get(id) }))
    );
  }

  /** Descarta listados y detalles para consultar datos actualizados la próxima vez. */
  private invalidarPersonas(): void {
    this.personasCache.clear();
    this.filasActualizadas.clear();
    this.detallesActualizados.clear();
  }

  /** Comparte y conserva respuestas por URL; elimina la entrada que falle. */
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

  /** Consulta el formulario completo por ID compartiendo solo la petición pendiente. */
  obtenerPersonaPorId(id: number): Observable<Usuario> {
    const revision = this.revisionSesion;
    return this.consultarCompartido<Usuario>(`${this.apiUrl}/${id}`, 'obtener la persona').pipe(
      tap(persona => { if (revision === this.revisionSesion) this.formularios.set(id, structuredClone(persona)); })
    );
  }

  /** Compara con el formulario original y fusiona solo los campos persistidos del PATCH. */
  actualizarPersona(id: number, datos: Usuario): Observable<Resultado> {
    const revision = this.revisionSesion;
    const original = this.formularios.get(id);
    const campos = ['nombre', 'apellido', 'genero', 'fechaNacimiento', 'ocupacion', 'correos', 'telefonos', 'direcciones'] as const;
    const cambios: Partial<Usuario> = {};
    for (const campo of campos) {
      if (datos[campo] !== undefined && (!original || JSON.stringify(datos[campo]) !== JSON.stringify(original[campo]))) {
        Object.assign(cambios, { [campo]: datos[campo] });
      }
    }
    if (!Object.keys(cambios).length) return of({ ok: true });
    return this.http.patch<Resultado>(`${this.apiUrl}/${id}`, cambios, { headers: this.getHeaders() })
      .pipe(tap(resultado => {
        if (resultado.ok && revision === this.revisionSesion) {
          const persistidos = resultado.persona ?? cambios;
          const persona = { ...original, ...datos, ...persistidos };
          this.formularios.set(id, persona as Usuario);
          const fila = { ...persistidos } as Partial<PersonaResumen>;
          if (persistidos.direcciones) fila.direcciones = persistidos.direcciones.slice(0, 1).map(d => ({ municipio: d.municipio }));
          this.actualizarFilaEnCache(id, fila);
          const detalle: Partial<PersonaDetalle> = {};
          for (const campo of ['genero', 'fechaNacimiento', 'direcciones'] as const) {
            if (persistidos[campo] !== undefined) Object.assign(detalle, { [campo]: persistidos[campo] });
          }
          this.detallesActualizados.set(id, { ...this.detallesActualizados.get(id), ...detalle });
          this.solicitudes.delete(`${this.apiUrl}/${id}`);
          this.contactosCache.clear();
          this.cambiosPersonales.next({
            id, nombre: persona.nombre, apellido: persona.apellido, correos: persona.correos,
            datosPersistidos: resultado.persona != null
          });
        }
      }),
        catchError(this.manejarError('actualizar el formulario')));
  }

  /** Conserva la última versión de cada fila sin acumular observables por cada edición. */
  private actualizarFilaEnCache(id: number, persona: Partial<PersonaResumen>): void {
    this.filasActualizadas.set(id, { ...this.filasActualizadas.get(id), ...persona });
  }

  /** Aplica cambios por ID al leer la lista, incluso si la petición inicial terminó después. */
  private aplicarFilasActualizadas(filas: PersonaResumen[]): PersonaResumen[] {
    return filas.map(fila => {
      const cambio = fila.id == null ? undefined : this.filasActualizadas.get(fila.id);
      return cambio ? { ...fila, ...cambio } : fila;
    });
  }

  /** Solicita la baja lógica y descarta listados y detalles almacenados. */
  eliminarPersona(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(tap(() => this.invalidarPersonas()), catchError(this.manejarError('eliminar el formulario')));
  }

  /** Consulta el catálogo compartiendo peticiones simultáneas. */
  obtenerOcupaciones(): Observable<string[]> {
    return this.consultarCompartido<string[]>('http://localhost:8080/api/ocupaciones', 'obtener las ocupaciones');
  }

  /** Conserva el catálogo por sesión y permite reintentar si falla. */
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

  /** Consulta los agregados del dashboard sin conservarlos tras finalizar. */
  obtenerResumen(): Observable<Resumen> {
    return this.consultarCompartido<Resumen>(`${this.apiUrl}/resumen`, 'obtener el resumen');
  }

  /** Deduplica consultas simultáneas y libera su entrada al finalizar. */
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

  /** Convierte el error HTTP en un mensaje utilizable por los componentes. */
  private manejarError(operacion: string) {
    return (error: HttpErrorResponse) => {
      const detalle = typeof error.error === 'string' ? error.error : error.error?.message;
      const mensaje = detalle || `No se pudo ${operacion}. Codigo HTTP: ${error.status || 'sin respuesta'}.`;
      console.error(`PersonasService: fallo al ${operacion}.`, error);
      return throwError(() => new Error(mensaje));
    };
  }

}
