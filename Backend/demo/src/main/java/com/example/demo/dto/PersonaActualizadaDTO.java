package com.example.demo.dto;

/** Confirma la edición y devuelve solo la fila que debe reemplazarse en el listado. */
public record PersonaActualizadaDTO(boolean ok, PersonaResumenDTO persona) {}
