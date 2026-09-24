export interface ContactoEmergencia {
  idContacto?: number;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  idParentesco?: number;
  parentesco?: string;
}

export interface Parentesco {
  id: number;
  nombre: string;
}
