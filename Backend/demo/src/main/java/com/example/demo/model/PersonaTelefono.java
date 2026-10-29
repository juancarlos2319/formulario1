package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "persona_telefono")
public class PersonaTelefono {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_persona", nullable = false)
    private Persona persona;

    @Column(nullable = false, length = 30)
    private String telefono;

    /** Permite a JPA crear una entidad de teléfono sin valores iniciales. */
    public PersonaTelefono() {}

    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Asigna el identificador. */
    public void setId(Long id) { this.id = id; }
    /** Devuelve la persona a la que pertenece este teléfono. */
    public Persona getPersona() { return persona; }
    /** Vincula este teléfono con su persona propietaria. */
    public void setPersona(Persona persona) { this.persona = persona; }
    /** Devuelve el teléfono asociado a la persona. */
    public String getTelefono() { return telefono; }
    /** Asigna el teléfono asociado a la persona. */
    public void setTelefono(String telefono) { this.telefono = telefono; }
}
