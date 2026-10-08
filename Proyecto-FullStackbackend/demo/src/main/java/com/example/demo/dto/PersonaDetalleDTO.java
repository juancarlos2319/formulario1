package com.example.demo.dto;

import java.time.LocalDate;
import java.util.List;

public record PersonaDetalleDTO(String genero, LocalDate fechaNacimiento,
                                List<PersonaDTO.DireccionDTO> direcciones) {}
