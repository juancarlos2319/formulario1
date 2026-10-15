package com.example.demo.dto;

/** Distingue campos omitidos de valores explicitamente enviados en una edicion parcial. */
public class PersonaParcialDTO extends PersonaDTO {
    private final java.util.Set<String> campos = new java.util.LinkedHashSet<>();
    /** Identifica los campos que deben conservarse en la respuesta parcial. */
    public java.util.Set<String> camposPresentes() { return java.util.Set.copyOf(campos); }
    /** Registra y asigna unicamente el campo recibido. */
    @Override public void setNombre(String valor) { campos.add("nombre"); super.setNombre(valor); }
    /** Registra y asigna unicamente el campo recibido. */
    @Override public void setApellido(String valor) { campos.add("apellido"); super.setApellido(valor); }
    /** Registra y asigna unicamente el campo recibido. */
    @Override public void setFechaNacimiento(java.time.LocalDate valor) { campos.add("fechaNacimiento"); super.setFechaNacimiento(valor); }
    /** Registra y asigna unicamente el campo recibido. */
    @Override public void setGenero(String valor) { campos.add("genero"); super.setGenero(valor); }
    /** Registra y asigna unicamente el campo recibido. */
    @Override public void setOcupacion(String valor) { campos.add("ocupacion"); super.setOcupacion(valor); }
    /** Registra y asigna unicamente el campo recibido. */
    @Override public void setCorreos(java.util.List<String> valor) { campos.add("correos"); super.setCorreos(valor); }
    /** Registra y asigna unicamente el campo recibido. */
    @Override public void setTelefonos(java.util.List<String> valor) { campos.add("telefonos"); super.setTelefonos(valor); }
    /** Registra y asigna unicamente el campo recibido. */
    @Override public void setDirecciones(java.util.List<PersonaDTO.DireccionDTO> valor) { campos.add("direcciones"); super.setDirecciones(valor); }
}
