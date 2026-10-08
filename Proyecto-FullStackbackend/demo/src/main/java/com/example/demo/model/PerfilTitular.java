package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "perfil_titular")
public class PerfilTitular {
    @Id @Column(name = "id_persona") private Long id;
    @OneToOne(optional = false) @MapsId @JoinColumn(name = "id_persona") private Persona persona;
    @ManyToOne(optional = false) @JoinColumn(name = "id_ocupacion") private CatalogoOcupacion ocupacion;
    @Column(name = "fecha_baja") private LocalDate fechaBaja;
    @OneToMany(mappedBy = "perfilTitular", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC, id ASC")
    private List<DireccionTitular> direcciones = new ArrayList<>();
    public Persona getPersona() { return persona; } public void setPersona(Persona persona) { this.persona = persona; }
    public CatalogoOcupacion getOcupacion() { return ocupacion; } public void setOcupacion(CatalogoOcupacion ocupacion) { this.ocupacion = ocupacion; }
    public LocalDate getFechaBaja() { return fechaBaja; } public void setFechaBaja(LocalDate fechaBaja) { this.fechaBaja = fechaBaja; }
    public List<DireccionTitular> getDirecciones() { return direcciones; }
}
