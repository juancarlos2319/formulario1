package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "catalogo_ocupacion")
public class CatalogoOcupacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    /** Permite a JPA crear una ocupación sin valores iniciales. */
    public CatalogoOcupacion() {}

    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Asigna el identificador. */
    public void setId(Long id) { this.id = id; }
    /** Devuelve el nombre. */
    public String getNombre() { return nombre; }
    /** Asigna el nombre. */
    public void setNombre(String nombre) { this.nombre = nombre; }
}