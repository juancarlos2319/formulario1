package com.example.demo.dto;

import java.time.LocalDate;

public class PersonaDTO {
    private java.util.List<String> telefonos = java.util.List.of();
    private java.util.List<String> correos = java.util.List.of();
    private java.util.List<DireccionDTO> direcciones = java.util.List.of();
    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    private java.util.List<ContactoDTO> contactosEmergencia;

    public java.util.List<String> getCorreos() { return correos; }
    public void setCorreos(java.util.List<String> valores) { correos = valores; }
    public java.util.List<String> getTelefonos() { return telefonos; }
    public void setTelefonos(java.util.List<String> valores) { telefonos = valores; }
    public java.util.List<DireccionDTO> getDirecciones() { return direcciones; }
    public void setDirecciones(java.util.List<DireccionDTO> valores) { direcciones = valores; }
    public java.util.List<ContactoDTO> getContactosEmergencia() { return contactosEmergencia; }
    public void setContactosEmergencia(java.util.List<ContactoDTO> valores) { contactosEmergencia = valores; }

    private Long id;
    private String nombre;
    private String apellido;
    private LocalDate fechaNacimiento;
    private String genero;
    private String ocupacion;
    private LocalDate fechaBaja;

    public PersonaDTO() {}

    public record DireccionDTO(String pais, String estado, String municipio, String colonia,
                               String codigoPostal, String calle, String numero) {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }
    public String getOcupacion() { return ocupacion; }
    public void setOcupacion(String ocupacion) { this.ocupacion = ocupacion; }
    public LocalDate getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDate fechaBaja) { this.fechaBaja = fechaBaja; }
}
