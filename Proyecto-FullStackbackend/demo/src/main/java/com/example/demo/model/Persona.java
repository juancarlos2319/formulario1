package com.example.demo.model;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@BatchSize(size = 32)
@Table(name = "persona")
public class Persona {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) private String nombre;
    @Column(nullable = false, length = 100) private String apellido;
    @Column(name = "fecha_nacimiento", nullable = false) private LocalDate fechaNacimiento;
    @Column(nullable = false, length = 50) private String genero;
    @OneToOne(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true) private PerfilTitular perfilTitular;
    @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id ASC") private List<ContactoEmergencia> contactosEmergencia = new ArrayList<>();
    @BatchSize(size = 32) @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id ASC") private List<PersonaCorreo> correos = new ArrayList<>();
    @BatchSize(size = 32) @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id ASC") private List<PersonaTelefono> telefonos = new ArrayList<>();
    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Asigna el identificador. */
    public void setId(Long id) { this.id = id; }
    /** Devuelve el nombre. */
    public String getNombre() { return nombre; }
    /** Asigna el nombre. */
    public void setNombre(String nombre) { this.nombre = nombre; }
    /** Devuelve el apellido. */
    public String getApellido() { return apellido; }
    /** Asigna el apellido. */
    public void setApellido(String apellido) { this.apellido = apellido; }
    /** Devuelve la fecha de nacimiento. */
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    /** Asigna la fecha de nacimiento. */
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    /** Devuelve el género. */
    public String getGenero() { return genero; }
    /** Asigna el género. */
    public void setGenero(String genero) { this.genero = genero; }
    /** Devuelve el perfil exclusivo del titular, si la persona tiene uno. */
    public PerfilTitular getPerfilTitular() { return perfilTitular; }
    /** Asocia el perfil y mantiene sincronizada su referencia de vuelta a la persona. */
    public void setPerfilTitular(PerfilTitular perfilTitular) { this.perfilTitular = perfilTitular; if (perfilTitular != null) perfilTitular.setPersona(this); }
    /** Indica si la persona tiene un perfil de titular asociado. */
    public boolean isTitular() { return perfilTitular != null; }
    /** Crea o retira el perfil para conservar compatibilidad con el indicador de titular. */
    public void setTitular(boolean titular) { if (titular && perfilTitular == null) setPerfilTitular(new PerfilTitular()); if (!titular) perfilTitular = null; }
    /** Obtiene la baja desde el perfil; devuelve null si la persona no tiene perfil. */
    public java.time.LocalDate getFechaBaja() { return perfilTitular == null ? null : perfilTitular.getFechaBaja(); }
    /** Asigna la baja al perfil y lo crea si todavía no existe. */
    public void setFechaBaja(java.time.LocalDate fechaBaja) { if (perfilTitular == null) setPerfilTitular(new PerfilTitular()); perfilTitular.setFechaBaja(fechaBaja); }
    /** Expone los vínculos salientes de emergencia de esta persona. */
    public List<ContactoEmergencia> getContactosEmergencia() { return contactosEmergencia; }
    /** Expone los correos asociados, ordenados por identificador. */
    public List<PersonaCorreo> getCorreos() { return correos; }
    /** Expone los teléfonos asociados, ordenados por identificador. */
    public List<PersonaTelefono> getTelefonos() { return telefonos; }
}
