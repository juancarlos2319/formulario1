package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "direccion_titular")
public class DireccionTitular {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_persona", nullable = false)
    private PerfilTitular perfilTitular;

    @Column(nullable = false)
    private int orden;

    @Column(nullable = false, length = 100)
    private String pais;

    @Column(nullable = false, length = 100)
    private String estado;

    @Column(nullable = false, length = 100)
    private String municipio;

    @Column(nullable = false, length = 150)
    private String colonia;

    @Column(name = "codigo_postal", nullable = false, length = 5)
    private String codigoPostal;

    @Column(nullable = false, length = 255)
    private String calle;

    @Column(nullable = false, length = 100)
    private String numero;

    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Devuelve el perfil propietario de esta dirección. */
    public PerfilTitular getPerfilTitular() { return perfilTitular; }
    /** Vincula la dirección con el perfil del titular. */
    public void setPerfilTitular(PerfilTitular perfilTitular) { this.perfilTitular = perfilTitular; }
    /** Devuelve la posición de la dirección; cero identifica la principal. */
    public int getOrden() { return orden; }
    /** Asigna la posición de la dirección dentro del conjunto del titular. */
    public void setOrden(int orden) { this.orden = orden; }
    /** Devuelve el país. */
    public String getPais() { return pais; }
    /** Asigna el país. */
    public void setPais(String pais) { this.pais = pais; }
    /** Devuelve el estado. */
    public String getEstado() { return estado; }
    /** Asigna el estado. */
    public void setEstado(String estado) { this.estado = estado; }
    /** Devuelve el municipio. */
    public String getMunicipio() { return municipio; }
    /** Asigna el municipio. */
    public void setMunicipio(String municipio) { this.municipio = municipio; }
    /** Devuelve la colonia. */
    public String getColonia() { return colonia; }
    /** Asigna la colonia. */
    public void setColonia(String colonia) { this.colonia = colonia; }
    /** Devuelve el código postal. */
    public String getCodigoPostal() { return codigoPostal; }
    /** Asigna el código postal. */
    public void setCodigoPostal(String codigoPostal) { this.codigoPostal = codigoPostal; }
    /** Devuelve la calle. */
    public String getCalle() { return calle; }
    /** Asigna la calle. */
    public void setCalle(String calle) { this.calle = calle; }
    /** Devuelve el número de la dirección. */
    public String getNumero() { return numero; }
    /** Asigna el número de la dirección. */
    public void setNumero(String numero) { this.numero = numero; }
}