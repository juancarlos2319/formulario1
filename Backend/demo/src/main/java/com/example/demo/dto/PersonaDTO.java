package com.example.demo.dto;

import java.time.LocalDate;

public class PersonaDTO {
    private java.util.List<String> telefonos = java.util.List.of();
    private java.util.List<String> correos = java.util.List.of();
    private java.util.List<DireccionDTO> direcciones = java.util.List.of();
    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    private java.util.List<ContactoDTO> contactosEmergencia;

    /** Devuelve la lista de correos. */
    public java.util.List<String> getCorreos() { return correos; }
    /** Asigna la lista de correos. */
    public void setCorreos(java.util.List<String> valores) { correos = valores; }
    /** Devuelve la lista de teléfonos. */
    public java.util.List<String> getTelefonos() { return telefonos; }
    /** Asigna la lista de teléfonos. */
    public void setTelefonos(java.util.List<String> valores) { telefonos = valores; }
    /** Devuelve la lista de direcciones. */
    public java.util.List<DireccionDTO> getDirecciones() { return direcciones; }
    /** Asigna la lista de direcciones. */
    public void setDirecciones(java.util.List<DireccionDTO> valores) { direcciones = valores; }
    /** Devuelve la lista de contactos de emergencia. */
    public java.util.List<ContactoDTO> getContactosEmergencia() { return contactosEmergencia; }
    /** Asigna los contactos recibidos para completar el alta del titular. */
    public void setContactosEmergencia(java.util.List<ContactoDTO> valores) { contactosEmergencia = valores; }

    private Long id;
    private String nombre;
    private String apellido;
    private LocalDate fechaNacimiento;
    private String genero;
    private String ocupacion;
    private LocalDate fechaBaja;

    /** Permite crear el DTO vacío para recibir y construir datos de personas. */
    public PersonaDTO() {}

    public record DireccionDTO(String pais, String estado, String municipio, String colonia,
                               String codigoPostal, String calle, String numero) {}

    /** Devuelve el identificador. */
    public Long getId() { return id; }
    /** Asigna el identificador. */
    public void setId(Long id) { this.id = id; }
    /** Devuelve el nombre. */
    public String getNombre() { return nombre; }
    /** Asigna el nombre. */
    public void setNombre(String nombre) { this.nombre = nombre; }
    /** Devuelve el apellido. */
    public String getApellido() { return apellido; }
    /** Asigna el apellido. */
    public void setApellido(String apellido) { this.apellido = apellido; }
    /** Devuelve la fecha de nacimiento. */
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    /** Asigna la fecha de nacimiento. */
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    /** Devuelve el género. */
    public String getGenero() { return genero; }
    /** Asigna el género. */
    public void setGenero(String genero) { this.genero = genero; }
    /** Devuelve la ocupación. */
    public String getOcupacion() { return ocupacion; }
    /** Asigna la ocupación. */
    public void setOcupacion(String ocupacion) { this.ocupacion = ocupacion; }
    /** Devuelve la fecha de baja. */
    public LocalDate getFechaBaja() { return fechaBaja; }
    /** Asigna la fecha de baja. */
    public void setFechaBaja(LocalDate fechaBaja) { this.fechaBaja = fechaBaja; }
}
