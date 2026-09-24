export interface ContactoEmergencia {
  idContacto?: number;
  nombre?: string;
  apellido?: string;
  fechaNacimiento?: string;
  genero?: string;
  email?: string;
  telefono?: string;
  idParentesco?: number;
  parentesco?: string;
}

export interface Parentesco {
  id: number;
  nombre: string;
}
