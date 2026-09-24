package com.example.demo.dto;

<<<<<<< Updated upstream
/** idContacto identifica a la persona, no a la fila de la relación. */
public record ContactoDTO(Long idContacto, String nombre, String apellido,
                          String telefono, Long idParentesco, String parentesco) {}
=======
import java.time.LocalDate;

public record ContactoDTO(
        String nombre,
        String telefono,
        String parentesco,
        String genero,
        LocalDate fechaNacimiento
) {}
>>>>>>> Stashed changes
