package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "perfil_titular")
public class PerfilTitular {
    @Id @Column(name = "id_persona") private Long id;
    @OneToOne(optional = false) @MapsId @JoinColumn(name = "id_persona") private Persona persona;
    @Column(nullable = false, length = 255) private String direccion;
    @Column(nullable = false, length = 100) private String ciudad;
    @ManyToOne(optional = false) @JoinColumn(name = "id_ocupacion") private CatalogoOcupacion ocupacion;
    @Column(name = "fecha_baja") private LocalDate fechaBaja;
    public Persona getPersona() { return persona; } public void setPersona(Persona persona) { this.persona = persona; }
    public String getDireccion() { return direccion; } public void setDireccion(String direccion) { this.direccion = direccion; }
    public String getCiudad() { return ciudad; } public void setCiudad(String ciudad) { this.ciudad = ciudad; }
    public CatalogoOcupacion getOcupacion() { return ocupacion; } public void setOcupacion(CatalogoOcupacion ocupacion) { this.ocupacion = ocupacion; }
    public LocalDate getFechaBaja() { return fechaBaja; } public void setFechaBaja(LocalDate fechaBaja) { this.fechaBaja = fechaBaja; }
}
