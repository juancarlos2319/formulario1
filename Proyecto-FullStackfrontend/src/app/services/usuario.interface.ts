export interface ContactoDTO {
  nombre: string;
  telefono: string;
  parentesco: string;
}

export interface CorreoDTO {
  email?: string;
  correo?: string;
}

export interface TelefonoDTO {
  telefono?: string;
  numero?: string;
}

export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  genero: string;
  fechaNacimiento: string;
  ocupacion?: any;
  ciudad?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  correos?: CorreoDTO[];
  telefonos?: TelefonoDTO[];
  contactos?: ContactoDTO[];

  // Propiedades requeridas por DashboardComponent
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaParentesco?: string;
}