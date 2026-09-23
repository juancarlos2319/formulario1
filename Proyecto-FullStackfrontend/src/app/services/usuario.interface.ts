export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  genero: string;
  direccion: string;
  ciudad: string;
  ocupacion: string;
  aceptaTerminos?: boolean;
  activo?: boolean;

  // Propiedades de contacto de emergencia
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaParentesco?: string;
}