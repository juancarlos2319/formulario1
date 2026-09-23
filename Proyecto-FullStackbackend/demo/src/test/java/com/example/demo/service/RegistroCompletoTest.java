package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RegistroCompletoTest {
    private final PersonaRepository personas = mock(PersonaRepository.class);
    private final CatalogoOcupacionRepository ocupaciones = mock(CatalogoOcupacionRepository.class);
    private final PersonaService service = new PersonaService();

    RegistroCompletoTest() {
        ReflectionTestUtils.setField(service, "personaRepository", personas);
        ReflectionTestUtils.setField(service, "ocupacionRepository", ocupaciones);
    }

    private FormularioDTO datos() {
        FormularioDTO dto = new FormularioDTO();
        dto.setEmail("principal@example.com");
        dto.setTelefono("5512345678");
        dto.setCorreosAdicionales(List.of("secundario@example.com"));
        dto.setTelefonosAdicionales(List.of("5587654321"));
        dto.setOcupacion("Docente");
        dto.setContactosEmergencia(List.of(new ContactoDTO("Ana", "5511111111", "Familiar"),
                new ContactoDTO("Luis", "5522222222", "Amigo")));
        return dto;
    }

    @Test void rechazaRegistroSinDosContactosAntesDeEscribir() {
        FormularioDTO dto = datos();
        dto.setContactosEmergencia(List.of());
        assertThrows(RuntimeException.class, () -> service.guardar(dto));
        verifyNoInteractions(personas, ocupaciones);
    }

    @Test void guardaPersonaConDosContactosYDevuelveSecundarios() {
        when(ocupaciones.findByNombre("Docente")).thenReturn(Optional.of(new CatalogoOcupacion()));
        when(personas.saveAndFlush(any(Persona.class))).thenAnswer(invocation -> {
            Persona p = invocation.getArgument(0);
            assertEquals(2, p.getContactosEmergencia().size());
            assertEquals(2, p.getCorreos().size());
            assertEquals(2, p.getTelefonos().size());
            p.getContactosEmergencia().forEach(c -> assertSame(p, c.getPersona()));
            return p;
        });
        FormularioDTO resultado = service.guardar(datos());
        assertEquals(List.of("secundario@example.com"), resultado.getCorreosAdicionales());
        assertEquals(List.of("5587654321"), resultado.getTelefonosAdicionales());
        verify(personas).saveAndFlush(any(Persona.class));
    }

    @Test void rechazaTelefonoSecundarioInvalido() {
        FormularioDTO dto = datos();
        dto.setTelefonosAdicionales(List.of("123"));
        assertThrows(IllegalArgumentException.class, () -> service.guardar(dto));
        verifyNoInteractions(personas, ocupaciones);
    }
}
