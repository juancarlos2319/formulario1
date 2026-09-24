package com.example.demo.model;

import jakarta.persistence.*;

/** Relación dirigida titular -> persona de contacto, con parentesco propio. */
@Entity
@org.hibernate.annotations.Check(constraints = "id_persona <> id_contacto")
@Table(name = "persona_contacto_emergencia",
       uniqueConstraints = @UniqueConstraint(name = "uq_pce_par", columnNames = {"id_persona", "id_contacto"}))
public class ContactoEmergencia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_persona", nullable = false)
    private Persona persona;

    // Sin cascada REMOVE: el contacto puede estar compartido con otros titulares.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_contacto", nullable = false)
    private Persona contacto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_parentesco", nullable = false)
    private CatalogoParentesco parentesco;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Persona getPersona() { return persona; }
    public void setPersona(Persona persona) { this.persona = persona; }
    public Persona getContacto() { return contacto; }
    public void setContacto(Persona contacto) { this.contacto = contacto; }
    public CatalogoParentesco getParentesco() { return parentesco; }
    public void setParentesco(CatalogoParentesco parentesco) { this.parentesco = parentesco; }
}
