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
    /** Devuelve la persona que comparte la identidad de este perfil. */
    public Persona getPersona() { return persona; }
    /** Asocia el perfil a la persona de la que toma su identificador. */
    public void setPersona(Persona persona) { this.persona = persona; }
    /** Devuelve la ocupación del catálogo asociada al titular. */
    public CatalogoOcupacion getOcupacion() { return ocupacion; }
    /** Asocia al titular una ocupación del catálogo. */
    public void setOcupacion(CatalogoOcupacion ocupacion) { this.ocupacion = ocupacion; }
    /** Devuelve la fecha de baja. */
    public LocalDate getFechaBaja() { return fechaBaja; }
    /** Asigna la fecha de baja. */
    public void setFechaBaja(LocalDate fechaBaja) { this.fechaBaja = fechaBaja; }
    /** Expone las direcciones del titular según su orden principal. */
    public List<DireccionTitular> getDirecciones() { return direcciones; }
}
