import { ContactoEmergencia } from './contacto-emergencia.interface';

export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  correosAdicionales?: string[];
  telefonosAdicionales?: string[];
  fechaNacimiento: string;
  genero: string;
  direccion: string;
  ciudad: string;
  ocupacion: string;
  aceptaTerminos?: boolean;
  activo?: boolean;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaParentesco?: string;
  contactosEmergencia?: ContactoEmergencia[];
}
