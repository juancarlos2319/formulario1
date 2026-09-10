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

    @Column(nullable = false, length = 20)
    private String telefono;

    public PersonaTelefono() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Persona getPersona() { return persona; }
    public void setPersona(Persona persona) { this.persona = persona; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
}