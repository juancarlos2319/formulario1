import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

export interface ContactoDTO {
  nombre: string;
  telefono: string;
  parentesco: string;
}

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contactos.component.html',
  styleUrls: ['./contactos.component.css']
})
export class ContactosComponent implements OnInit {
  personaId!: number;
  mensajeError: string = '';
  mensajeExito: string = '';

  contacto1: ContactoDTO = {
    nombre: '',
    telefono: '',
    parentesco: ''
  };

  contacto2: ContactoDTO = {
    nombre: '',
    telefono: '',
    parentesco: ''
  };

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.personaId = +idParam;
      this.cargarContactos();
    }
  }

  cargarContactos(): void {
    this.http.get<ContactoDTO[]>(`http://localhost:8080/api/formularios/${this.personaId}/contactos`)
      .subscribe({
        next: (data) => {
          if (data && data.length >= 2) {
            this.contacto1 = { ...data[0] };
            this.contacto2 = { ...data[1] };
          }
        },
        error: (err) => {
          console.error('Error al cargar contactos:', err);
        }
      });
  }

  guardarContactos(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    const payload: ContactoDTO[] = [
      {
        nombre: this.contacto1.nombre,
        telefono: this.contacto1.telefono,
        parentesco: this.contacto1.parentesco
      },
      {
        nombre: this.contacto2.nombre,
        telefono: this.contacto2.telefono,
        parentesco: this.contacto2.parentesco
      }
    ];

    this.http.put(`http://localhost:8080/api/formularios/${this.personaId}/contactos`, payload)
      .subscribe({
        next: (res) => {
          this.mensajeExito = '¡Contactos guardados exitosamente!';
          alert('¡Contactos guardados exitosamente!');
        },
        error: (err) => {
          console.error('Error al guardar contactos:', err);
          this.mensajeError = 'Ocurrió un error al guardar los contactos. Revisa los datos ingresados.';
        }
      });
  }
}