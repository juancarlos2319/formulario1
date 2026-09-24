import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface ResultadoCodigoPostal {
  asentamiento: string;
  estado: string;
  municipio: string;
}

export interface RespuestaCodigoPostal {
  resultados: ResultadoCodigoPostal[];
}

@Injectable({ providedIn: 'root' })
export class CodigoPostalService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://www.correosmexico.com.mx/api/cp';

  consultar(codigoPostal: string): Observable<RespuestaCodigoPostal> {
    return this.http.get<RespuestaCodigoPostal>(this.apiUrl, {
      params: { cp: codigoPostal }
    }).pipe(catchError((error: HttpErrorResponse) => {
      console.error('CodigoPostalService: fallo al consultar el codigo postal.', error);
      return throwError(() => new Error('No se pudo consultar el codigo postal.'));
    }));
  }
}
