package com.example.demo.service;

import com.example.demo.controller.PersonaController;
import com.example.demo.dto.PersonaDTO;
import com.example.demo.dto.ResultadoDTO;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PersonaContratosTest {
    @Test void patchJsonDistingueOmitidosYDevuelveSoloCambios() throws Exception {
        var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
        var cambios = mapper.readValue("{\"nombre\":\"Nuevo\"}", com.example.demo.dto.PersonaParcialDTO.class);
        assertEquals(java.util.Set.of("nombre"), cambios.camposPresentes());
        var nulo = mapper.readValue("{\"nombre\":null}", com.example.demo.dto.PersonaParcialDTO.class);
        assertTrue(nulo.camposPresentes().contains("nombre"));
        assertNull(nulo.getNombre());
        PersonaService service = mock(PersonaService.class);
        PersonaController controller = new PersonaController();
        ReflectionTestUtils.setField(controller, "personaService", service);
        when(service.actualizarParcial(7L, cambios)).thenReturn(java.util.Map.of("nombre", "Nuevo"));
        assertEquals(mapper.readTree("{\"ok\":true,\"persona\":{\"nombre\":\"Nuevo\"}}"),
                mapper.readTree(mapper.writeValueAsString(controller.actualizarParcial(7L, cambios))));
        verify(service, never()).obtenerPorId(any());
        verify(service, never()).obtenerTodos();
    }

    @Test void contratoExponeSoloElArregloDeDirecciones() throws Exception {
        var propiedades = java.util.Arrays.stream(java.beans.Introspector.getBeanInfo(PersonaDTO.class)
            .getPropertyDescriptors()).map(descriptor -> descriptor.getName()).toList();
        assertTrue(propiedades.contains("direcciones"));
        assertFalse(propiedades.contains("direccion"));
        assertFalse(propiedades.contains("ciudad"));
        assertFalse(java.util.Arrays.stream(com.example.demo.dto.PersonaResumenDTO.class.getRecordComponents())
                .anyMatch(c -> c.getName().equals("ciudad")));
    }

    @Test void detallesNoConsultanElFormularioCompleto() {
        PersonaService service = mock(PersonaService.class);
        PersonaController controller = new PersonaController();
        ReflectionTestUtils.setField(controller, "personaService", service);
        var detalle = new com.example.demo.dto.PersonaDetalleDTO("Otro", java.time.LocalDate.of(1990, 1, 1), List.of());
        when(service.obtenerDetalle(7L)).thenReturn(detalle);
        assertEquals(detalle, controller.obtenerDetalle(7L));
        verify(service, never()).obtenerPorId(any());
        assertEquals(List.of("genero", "fechaNacimiento", "direcciones"), java.util.Arrays.stream(
                com.example.demo.dto.PersonaDetalleDTO.class.getRecordComponents()).map(component -> component.getName()).toList());
        assertEquals(List.of("municipio"), java.util.Arrays.stream(
            com.example.demo.dto.PersonaResumenDTO.DireccionResumenDTO.class.getRecordComponents()).map(component -> component.getName()).toList());
    }

    @Test void edicionDevuelveSoloLaFilaActualizadaYLasDemasEscriturasConfirmacion() {
        PersonaService service = mock(PersonaService.class);
        PersonaController controller = new PersonaController();
        ReflectionTestUtils.setField(controller, "personaService", service);
        PersonaDTO datos = new PersonaDTO();
        datos.setCorreos(List.of("uno@example.com", "dos@example.com"));
        datos.setTelefonos(List.of("5512345678"));
        var fila = new com.example.demo.dto.PersonaResumenDTO(7L, "Titular", "Prueba", "Docente",
                List.of("uno@example.com"), List.of("5512345678"), null, List.of(), true);
        when(service.actualizar(7L, datos)).thenReturn(fila);
        assertEquals(new ResultadoDTO(true), controller.guardarPersona(datos).getBody());
        assertEquals(new com.example.demo.dto.PersonaActualizadaDTO(true, fila), controller.actualizarPersona(7L, datos).getBody());
        assertEquals(new ResultadoDTO(true), controller.guardarContactos(7L, List.of()));
        verify(service).guardar(datos);
        verify(service).actualizar(7L, datos);
        verify(service).guardarContactos(7L, List.of());
        verify(service, never()).obtenerPorId(any());
        verify(service, never()).obtenerContactos(any());
    }

    @Test void erroresDeValidacionConservanSuCodigo() {
        PersonaService service = mock(PersonaService.class);
        PersonaController controller = new PersonaController();
        ReflectionTestUtils.setField(controller, "personaService", service);
        PersonaDTO datos = new PersonaDTO();
        when(service.actualizar(7L, datos)).thenThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Duplicado"));
        var respuesta = controller.actualizarPersona(7L, datos);
        assertEquals(409, respuesta.getStatusCode().value());
        assertEquals("Duplicado", respuesta.getBody());
    }
}
