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

    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Asigna el identificador. */
    public void setId(Long id) { this.id = id; }
    /** Devuelve el titular al que pertenece el vínculo de emergencia. */
    public Persona getPersona() { return persona; }
    /** Asigna el titular propietario del vínculo. */
    public void setPersona(Persona persona) { this.persona = persona; }
    /** Devuelve la persona compartida que actúa como contacto. */
    public Persona getContacto() { return contacto; }
    /** Asocia la persona de contacto sin copiar sus datos personales. */
    public void setContacto(Persona contacto) { this.contacto = contacto; }
    /** Devuelve el parentesco específico de este vínculo. */
    public CatalogoParentesco getParentesco() { return parentesco; }
    /** Asigna el parentesco sin modificar los demás vínculos de la persona. */
    public void setParentesco(CatalogoParentesco parentesco) { this.parentesco = parentesco; }
}
