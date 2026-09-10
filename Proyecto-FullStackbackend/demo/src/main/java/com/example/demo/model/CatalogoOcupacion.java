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

    public CatalogoOcupacion() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
}