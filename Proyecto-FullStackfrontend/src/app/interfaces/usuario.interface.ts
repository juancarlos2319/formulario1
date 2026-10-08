import { ContactoEmergencia } from './contacto-emergencia.interface';

export interface PersonaResumen {
  id?: number;
  nombre: string;
  apellido: string;
  correos: string[];
  telefonos: string[];
  ocupacion: string;
  fechaBaja?: string | null;
  direcciones?: Pick<Direccion, 'municipio'>[];
  puedeEliminar?: boolean;
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

export interface PersonaDetalle {
  genero: string;
  fechaNacimiento: string;
  direcciones: Direccion[];
}

export interface Usuario extends PersonaResumen {
  direcciones?: Direccion[];
  fechaNacimiento: string;
  genero: string;
  contactosEmergencia?: ContactoEmergencia[];
}

export interface Resultado { ok: boolean; }
export interface Resumen {
  total: number;
  conCorreo: number;
  conTelefono: number;
  ocupaciones: { nombre: string; cantidad: number }[];
}
