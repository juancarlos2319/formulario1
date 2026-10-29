package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    private String rol;

    @Column(name = "id_persona", nullable = false, unique = true)
    private Long idPersona;

    // Getters y Setters
    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Asigna el identificador. */
    public void setId(Long id) { this.id = id; }

    /** Devuelve el nombre de usuario de la cuenta. */
    public String getUsername() { return username; }
    /** Asigna el nombre de usuario de la cuenta. */
    public void setUsername(String username) { this.username = username; }

    /** Devuelve el hash de contraseña almacenado para la cuenta. */
    public String getPassword() { return password; }
    /** Asigna el hash de contraseña; este método no cifra el valor recibido. */
    public void setPassword(String password) { this.password = password; }

    /** Devuelve el rol asignado a la cuenta. */
    public String getRol() { return rol; }
    /** Asigna el rol asignado a la cuenta. */
    public void setRol(String rol) { this.rol = rol; }

    /** Devuelve el ID de la persona vinculada con la cuenta. */
    public Long getIdPersona() { return idPersona; }
    /** Vincula la cuenta con el identificador de una persona. */
    public void setIdPersona(Long idPersona) { this.idPersona = idPersona; }
}
