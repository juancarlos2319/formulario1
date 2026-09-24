package com.example.demo.dto;

import java.time.LocalDate;

public record ContactoDTO(Long idContacto, String nombre, String apellido, LocalDate fechaNacimiento,
                          String genero, String email, String telefono, Long idParentesco, String parentesco) {
    /** Compatibilidad temporal para solicitudes antiguas sin datos personales completos. */
    public ContactoDTO(Long idContacto, String nombre, String apellido, String telefono, Long idParentesco, String parentesco) {
        this(idContacto, nombre, apellido, null, null, null, telefono, idParentesco, parentesco);
    }
}
