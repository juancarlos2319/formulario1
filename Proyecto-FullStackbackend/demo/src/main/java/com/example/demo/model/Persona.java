package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "persona")
public class Persona {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) private String nombre;
    @Column(nullable = false, length = 100) private String apellido;
    @Column(name = "fecha_nacimiento", nullable = false) private LocalDate fechaNacimiento;
    @Column(nullable = false, length = 50) private String genero;
    @OneToOne(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true) private PerfilTitular perfilTitular;
    @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id ASC") private List<ContactoEmergencia> contactosEmergencia = new ArrayList<>();
    @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id ASC") private List<PersonaCorreo> correos = new ArrayList<>();
    @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id ASC") private List<PersonaTelefono> telefonos = new ArrayList<>();
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; } public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellido() { return apellido; } public void setApellido(String apellido) { this.apellido = apellido; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; } public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    public String getGenero() { return genero; } public void setGenero(String genero) { this.genero = genero; }
    public PerfilTitular getPerfilTitular() { return perfilTitular; }
    public void setPerfilTitular(PerfilTitular perfilTitular) { this.perfilTitular = perfilTitular; if (perfilTitular != null) perfilTitular.setPersona(this); }
    /** Compatibilidad para código que todavía consulta si una persona es titular. */
    public boolean isTitular() { return perfilTitular != null; }
    public void setTitular(boolean titular) { if (titular && perfilTitular == null) setPerfilTitular(new PerfilTitular()); if (!titular) perfilTitular = null; }
    public java.time.LocalDate getFechaBaja() { return perfilTitular == null ? null : perfilTitular.getFechaBaja(); }
    public void setFechaBaja(java.time.LocalDate fechaBaja) { if (perfilTitular == null) setPerfilTitular(new PerfilTitular()); perfilTitular.setFechaBaja(fechaBaja); }
    public List<ContactoEmergencia> getContactosEmergencia() { return contactosEmergencia; }
    public List<PersonaCorreo> getCorreos() { return correos; }
    public List<PersonaTelefono> getTelefonos() { return telefonos; }
}
