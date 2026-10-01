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
    private Usuario cuentaEditable() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setUsername("cuenta-prueba");
        usuario.setPassword("hash-de-prueba");
        usuario.setRol("ROLE_ADMIN");
        usuario.setIdPersona(42L);
        when(usuarios.findByUsername("cuenta-prueba")).thenReturn(Optional.of(usuario));
        when(encoder.matches("actual-prueba", "hash-de-prueba")).thenReturn(true);
        return usuario;
    }

    @Test void cambiaUsuarioYPasswordSinModificarPersonaNiRol() {
        Usuario usuario = cuentaEditable();
        when(encoder.encode("nueva-prueba")).thenReturn("hash-nuevo-prueba");
        service.actualizarLogin("cuenta-prueba", new com.example.demo.dto.EditarCuentaDTO("otro-usuario", "actual-prueba", "nueva-prueba"));
        assertEquals("otro-usuario", usuario.getUsername());
        assertEquals("hash-nuevo-prueba", usuario.getPassword());
        assertEquals("ROLE_ADMIN", usuario.getRol());
        assertEquals(42L, usuario.getIdPersona());
        verify(usuarios).saveAndFlush(usuario);
        org.mockito.Mockito.verifyNoInteractions(personas);
    }

    @Test void conservaPasswordSiNoSeSolicitaCambiarla() {
        Usuario usuario = cuentaEditable();
        service.actualizarLogin("cuenta-prueba", new com.example.demo.dto.EditarCuentaDTO("cuenta-prueba", "actual-prueba", ""));
        assertEquals("hash-de-prueba", usuario.getPassword());
        verify(usuarios).saveAndFlush(usuario);
    }

    @Test void rechazaPasswordActualIncorrectaSinGuardar() {
        cuentaEditable();
        var error = assertThrows(ResponseStatusException.class, () -> service.actualizarLogin("cuenta-prueba",
                new com.example.demo.dto.EditarCuentaDTO("otro-usuario", "incorrecta-prueba", "")));
        assertEquals(400, error.getStatusCode().value());
        verify(usuarios, org.mockito.Mockito.never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test void rechazaUsuarioDeOtraCuentaSinGuardar() {
        cuentaEditable();
        Usuario otra = new Usuario(); otra.setId(2L);
        when(usuarios.findByUsername("ocupado-prueba")).thenReturn(Optional.of(otra));
        var error = assertThrows(ResponseStatusException.class, () -> service.actualizarLogin("cuenta-prueba",
                new com.example.demo.dto.EditarCuentaDTO("ocupado-prueba", "actual-prueba", "")));
        assertEquals(409, error.getStatusCode().value());
        verify(usuarios, org.mockito.Mockito.never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test void noDevuelvePasswordEnConsultaLogin() {
        cuentaEditable();
        assertEquals(java.util.Map.of("username", "cuenta-prueba"), service.obtenerDatosLogin("cuenta-prueba"));
    }
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final PersonaRepository personas = mock(PersonaRepository.class);
    private final org.springframework.security.crypto.password.PasswordEncoder encoder = mock(org.springframework.security.crypto.password.PasswordEncoder.class);
    private final CuentaService service = new CuentaService(usuarios, personas, encoder);

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
