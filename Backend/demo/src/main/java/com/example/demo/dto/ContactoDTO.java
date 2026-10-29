package com.example.demo.dto;

import java.time.LocalDate;
import java.util.List;

public record ContactoDTO(Long idContacto, String nombre, String apellido, LocalDate fechaNacimiento,
                          String genero, List<String> correos, List<String> telefonos,
                          Long idParentesco, String parentesco) {}
