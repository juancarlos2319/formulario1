import { ContactoEmergencia } from './contacto-emergencia.interface';

export interface PersonaResumen {
  id?: number;
  nombre: string;
  apellido: string;
  correos: string[];
  telefonos: string[];
  ciudad: string;
  ocupacion: string;
  fechaBaja?: string | null;
  direcciones?: Direccion[];
}

export interface Direccion {
  pais: string;
  estado: string;
  municipio: string;
  colonia: string;
  codigoPostal: string;
  calle: string;
  numero: string;
}

export interface Usuario extends PersonaResumen {
  fechaNacimiento: string;
  genero: string;
  direccion: string;
  contactosEmergencia?: ContactoEmergencia[];
}

export interface Resultado { ok: boolean; }
export interface Resumen {
  total: number;
  conCorreo: number;
  conTelefono: number;
  ocupaciones: { nombre: string; cantidad: number }[];
}
