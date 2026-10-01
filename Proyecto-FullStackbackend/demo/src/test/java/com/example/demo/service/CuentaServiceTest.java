package com.example.demo.service;

import com.example.demo.model.Persona;
import com.example.demo.model.PersonaCorreo;
import com.example.demo.model.Usuario;
import com.example.demo.repository.PersonaRepository;
import com.example.demo.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CuentaServiceTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final PersonaRepository personas = mock(PersonaRepository.class);
    private final CuentaService service = new CuentaService(usuarios, personas);

    @Test
    void devuelveSoloNombreYCorreoDeLaCuentaAutenticada() {
        Usuario usuario = new Usuario();
        usuario.setIdPersona(42L);
        Persona persona = new Persona();
        persona.setNombre("Nombre de prueba");
        persona.setApellido("Apellido de prueba");
        PersonaCorreo correo = new PersonaCorreo();
        correo.setCorreo("usuario@example.com");
        persona.getCorreos().add(correo);
        when(usuarios.findByUsername("usuario-prueba")).thenReturn(Optional.of(usuario));
        when(personas.findById(42L)).thenReturn(Optional.of(persona));

        var resultado = service.obtenerUsuarioActual("usuario-prueba");

        assertEquals("Nombre de prueba Apellido de prueba", resultado.nombre());
        assertEquals("usuario@example.com", resultado.correo());
        verify(usuarios).findByUsername("usuario-prueba");
        verify(personas).findById(42L);
    }

    @Test
    void devuelve404SiLaCuentaAutenticadaYaNoExiste() {
        when(usuarios.findByUsername("usuario-prueba")).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.obtenerUsuarioActual("usuario-prueba"));

        assertEquals(404, error.getStatusCode().value());
    }
}