package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "persona_correo")
public class PersonaCorreo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_persona", nullable = false)
    private Persona persona;

    @Column(nullable = false, length = 150)
    private String correo;

    /** Permite a JPA crear una entidad de correo sin valores iniciales. */
    public PersonaCorreo() {}

    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Asigna el identificador. */
    public void setId(Long id) { this.id = id; }
    /** Devuelve la persona a la que pertenece este correo. */
    public Persona getPersona() { return persona; }
    /** Vincula este correo con su persona propietaria. */
    public void setPersona(Persona persona) { this.persona = persona; }
    /** Devuelve el correo asociado a la persona. */
    public String getCorreo() { return correo; }
    /** Asigna el correo asociado a la persona. */
    public void setCorreo(String correo) { this.correo = correo; }
}
