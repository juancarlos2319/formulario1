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
    @Test void contratoExponeSoloElArregloDeDirecciones() throws Exception {
        var propiedades = java.util.Arrays.stream(java.beans.Introspector.getBeanInfo(PersonaDTO.class)
                .getPropertyDescriptors()).map(java.beans.PropertyDescriptor::getName).toList();
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
                com.example.demo.dto.PersonaDetalleDTO.class.getRecordComponents()).map(java.lang.reflect.RecordComponent::getName).toList());
        assertEquals(List.of("municipio"), java.util.Arrays.stream(
                com.example.demo.dto.PersonaResumenDTO.DireccionResumenDTO.class.getRecordComponents()).map(java.lang.reflect.RecordComponent::getName).toList());
    }

    @Test void escriturasDevuelvenSoloConfirmacion() {
        PersonaService service = mock(PersonaService.class);
        PersonaController controller = new PersonaController();
        ReflectionTestUtils.setField(controller, "personaService", service);
        PersonaDTO datos = new PersonaDTO();
        datos.setCorreos(List.of("uno@example.com", "dos@example.com"));
        datos.setTelefonos(List.of("5512345678"));
        assertEquals(new ResultadoDTO(true), controller.guardarPersona(datos).getBody());
        assertEquals(new ResultadoDTO(true), controller.actualizarPersona(7L, datos).getBody());
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
        doThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Duplicado"))
                .when(service).actualizar(7L, datos);
        var respuesta = controller.actualizarPersona(7L, datos);
        assertEquals(409, respuesta.getStatusCode().value());
        assertEquals("Duplicado", respuesta.getBody());
    }
}
