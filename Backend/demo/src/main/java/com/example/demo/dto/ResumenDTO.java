package com.example.demo.dto;

import java.util.List;

public record ResumenDTO(long total, long conCorreo, long conTelefono, List<Ocupacion> ocupaciones) {
    public record Ocupacion(String nombre, long cantidad) {}
}
