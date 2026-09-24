import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    });
  }
}
