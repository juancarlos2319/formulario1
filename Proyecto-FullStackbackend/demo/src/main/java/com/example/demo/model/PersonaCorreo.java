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

    @Column(nullable = false, length = 100)
    private String correo;

    public PersonaCorreo() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Persona getPersona() { return persona; }
    public void setPersona(Persona persona) { this.persona = persona; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
}