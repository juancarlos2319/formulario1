package com.example.demo.dto;

/** idContacto identifica a la persona, no a la fila de la relación. */
public record ContactoDTO(Long idContacto, String nombre, String apellido,
                          String telefono, Long idParentesco, String parentesco) {}
