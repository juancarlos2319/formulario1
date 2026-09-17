package com.example.demo;

import com.example.demo.dto.FormularioDTO;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.service.AuthService;
import com.example.demo.service.PersonaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "TEST_DATABASE_URL",
        matches = "jdbc:postgresql://(localhost|127\\.0\\.0\\.1):[0-9]+/nomina_backend_test")
@SpringBootTest(properties = {
        "spring.datasource.url=${TEST_DATABASE_URL}",
        "spring.datasource.username=${TEST_DATABASE_USERNAME:postgres}",
        "spring.datasource.password=${TEST_DATABASE_PASSWORD:test-only}",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "jwt.secret=test-only-secret-with-at-least-32-bytes"
})
class DemoApplicationTests {
    @Autowired PersonaService personas;
    @Autowired AuthService auth;
    @Autowired UsuarioRepository usuarios;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void resetDisposableDatabase() {
        jdbc.execute("TRUNCATE TABLE persona, catalogo_ocupacion RESTART IDENTITY CASCADE");
    }

    @Test
    void addsPreviouslyMissingEmailAndPhoneAndPreservesThemOnNull() {
        FormularioDTO saved = personas.guardar(formulario());
        FormularioDTO update = formulario();
        update.setEmail("persona@example.test");
        update.setTelefono("7711234567");
        personas.actualizar(saved.getId(), update);
        FormularioDTO result = personas.obtenerTodos().getFirst();
        assertEquals(update.getEmail(), result.getEmail());
        assertEquals(update.getTelefono(), result.getTelefono());
        personas.actualizar(saved.getId(), formulario());
        assertEquals(update.getEmail(), personas.obtenerTodos().getFirst().getEmail());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM persona_correo", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM persona_telefono", Integer.class));
    }

    @Test
    void simultaneousCreatesCannotExceedTwenty() throws Exception {
        for (int i = 0; i < 19; i++) personas.guardar(formulario());
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Boolean> create = () -> {
            ready.countDown();
            if (!start.await(10, TimeUnit.SECONDS)) throw new AssertionError("No se inició la prueba concurrente");
            try {
                personas.guardar(formulario());
                return true;
            } catch (ResponseStatusException e) {
                assertEquals(409, e.getStatusCode().value());
                return false;
            }
        };
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Boolean> first = executor.submit(create);
            Future<Boolean> second = executor.submit(create);
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            assertNotEquals(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));
        }
        assertEquals(20, personas.obtenerTodos().size());
    }

    @Test
    void failedCreateRollsBackNewOccupation() {
        jdbc.execute("ALTER TABLE persona ADD CONSTRAINT test_reject_name CHECK (nombre <> 'Rechazada')");
        try {
            FormularioDTO dto = formulario();
            dto.setNombre("Rechazada");
            assertThrows(RuntimeException.class, () -> personas.guardar(dto));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM catalogo_ocupacion", Integer.class));
            assertEquals(0, personas.obtenerTodos().size());
        } finally {
            jdbc.execute("ALTER TABLE persona DROP CONSTRAINT test_reject_name");
        }
    }

    @Test
    void loginAndExistingSessionRejectInactiveOrDeletedAdministrators() {
        FormularioDTO persona = personas.guardar(formulario());
        String hash = new BCryptPasswordEncoder(4).encode("test-password");
        jdbc.update("INSERT INTO usuario (username, password, rol, id_persona) VALUES (?, ?, ?, ?)",
                "admin", hash, "ROLE_ADMIN", persona.getId());
        assertEquals("admin", auth.authenticate("admin", "test-password"));
        assertTrue(auth.isActiveAdmin("admin"));
        jdbc.update("UPDATE usuario SET rol = 'ROLE_USER' WHERE username = 'admin'");
        assertFalse(auth.isActiveAdmin("admin"));
        assertThrows(ResponseStatusException.class, () -> auth.authenticate("admin", "test-password"));
        jdbc.update("UPDATE usuario SET rol = 'ROLE_ADMIN' WHERE username = 'admin'");
        personas.eliminarLogico(persona.getId());
        assertFalse(auth.isActiveAdmin("admin"));
        assertThrows(ResponseStatusException.class, () -> auth.authenticate("admin", "test-password"));
        usuarios.deleteAll();
        assertFalse(auth.isActiveAdmin("admin"));
    }

    @Test
    void invalidBirthDateIsRejectedWithoutWrites() {
        FormularioDTO dto = formulario();
        dto.setFechaNacimiento(LocalDate.now().plusDays(1));
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> personas.guardar(dto)).getStatusCode().value());
        assertEquals(0, personas.obtenerTodos().size());
    }

    private FormularioDTO formulario() {
        FormularioDTO dto = new FormularioDTO();
        dto.setNombre("Persona");
        dto.setApellido("Prueba");
        dto.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        dto.setOcupacion("Docente");
        return dto;
    }
}
