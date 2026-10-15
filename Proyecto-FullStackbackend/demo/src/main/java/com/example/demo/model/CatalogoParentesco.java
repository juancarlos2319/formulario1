package com.example.demo.model;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

@Entity
@BatchSize(size = 32)
@Table(name = "catalogo_parentesco")
public class CatalogoParentesco {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String nombre;

    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Asigna el identificador. */
    public void setId(Long id) { this.id = id; }
    /** Devuelve el nombre. */
    public String getNombre() { return nombre; }
    /** Asigna el nombre. */
    public void setNombre(String nombre) { this.nombre = nombre; }
}
