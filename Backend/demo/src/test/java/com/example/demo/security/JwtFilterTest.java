package com.example.demo.security;

import com.example.demo.model.Usuario;
import com.example.demo.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtFilterTest {
    private static final String SECRET = "test-only-secret-with-at-least-32-bytes";
    private final JwtUtil jwt = new JwtUtil();
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final JwtFilter filtro;

    JwtFilterTest() {
        ReflectionTestUtils.setField(jwt, "secretKey", SECRET);
        filtro = new JwtFilter(jwt, usuarios);
    }

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void cargaRolVigenteDeLaCuentaEnLaAutenticacion() throws Exception {
        Usuario usuario = new Usuario();
        usuario.setRol("ROLE_ADMIN");
        when(usuarios.findByUsername("admin-prueba")).thenReturn(Optional.of(usuario));
        var request = solicitud(jwt.generateToken("admin-prueba"));
        var response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> assertTrue(SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")));

        filtro.doFilter(request, response, chain);

        verify(usuarios).findByUsername("admin-prueba");
    }

    @Test
    void cuentaConOtroRolRecibeSoloSuRolVigente() throws Exception {
        Usuario usuario = new Usuario();
        usuario.setRol("ROLE_USER");
        when(usuarios.findByUsername("usuario-prueba")).thenReturn(Optional.of(usuario));
        var request = solicitud(jwt.generateToken("usuario-prueba"));
        var response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            assertTrue(authentication.isAuthenticated());
            assertEquals("ROLE_USER", authentication.getAuthorities().iterator().next().getAuthority());
            assertFalse(authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
        };

        filtro.doFilter(request, response, chain);

        verify(usuarios).findByUsername("usuario-prueba");
    }

    @Test
    void cuentaEliminadaNoSeAutenticaAunqueElTokenSigaVigente() throws Exception {
        when(usuarios.findByUsername("eliminado-prueba")).thenReturn(Optional.empty());
        var request = solicitud(jwt.generateToken("eliminado-prueba"));
        var response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> assertNull(SecurityContextHolder.getContext().getAuthentication());

        filtro.doFilter(request, response, chain);

        verify(usuarios).findByUsername("eliminado-prueba");
    }

    private MockHttpServletRequest solicitud(String token) {
        var request = new MockHttpServletRequest("GET", "/api/personas/resumen");
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }
}
