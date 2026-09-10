package com.example.demo.dto;

import java.time.LocalDate;

public class FormularioDTO {

    private Long id;
    private String nombre;
    private String apellido;
    private String email;
    private String telefono;
    private LocalDate fechaNacimiento;
    private String genero;
    private String direccion;
    private String ciudad;
    private String ocupacion;
    private Boolean aceptaTerminos;
    private Boolean activo;

    // Campos de Emergencia
    private String contactoEmergenciaNombre;
    private String contactoEmergenciaTelefono;
    private String contactoEmergenciaParentesco;

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }

    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }

    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }

    public String getCiudad() { return ciudad; }
    public void setCiudad(String ciudad) { this.ciudad = ciudad; }

    public String getOcupacion() { return ocupacion; }
    public void setOcupacion(String ocupacion) { this.ocupacion = ocupacion; }

    public Boolean getAceptaTerminos() { return aceptaTerminos; }
    public void setAceptaTerminos(Boolean aceptaTerminos) { this.aceptaTerminos = aceptaTerminos; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public String getContactoEmergenciaNombre() { return contactoEmergenciaNombre; }
    public void setContactoEmergenciaNombre(String contactoEmergenciaNombre) { this.contactoEmergenciaNombre = contactoEmergenciaNombre; }

    public String getContactoEmergenciaTelefono() { return contactoEmergenciaTelefono; }
    public void setContactoEmergenciaTelefono(String contactoEmergenciaTelefono) { this.contactoEmergenciaTelefono = contactoEmergenciaTelefono; }

    public String getContactoEmergenciaParentesco() { return contactoEmergenciaParentesco; }
    public void setContactoEmergenciaParentesco(String contactoEmergenciaParentesco) { this.contactoEmergenciaParentesco = contactoEmergenciaParentesco; }
}