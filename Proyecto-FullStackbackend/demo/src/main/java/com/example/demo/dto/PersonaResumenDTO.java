package com.example.demo.dto;

import java.time.LocalDate;
import java.util.List;

public record PersonaResumenDTO(Long id, String nombre, String apellido, String ciudad, String ocupacion,
                                List<String> correos, List<String> telefonos, LocalDate fechaBaja,
                                List<PersonaDTO.DireccionDTO> direcciones, boolean puedeEliminar) {}
