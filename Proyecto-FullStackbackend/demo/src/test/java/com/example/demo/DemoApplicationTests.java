package com.example.demo;

import com.example.demo.dto.*;
import com.example.demo.service.PersonaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "TEST_DATABASE_URL",
        matches = "jdbc:postgresql://(localhost|127\\.0\\.0\\.1):[0-9]+/nomina_backend_test")
@SpringBootTest(properties = {
        "spring.datasource.url=${TEST_DATABASE_URL}",
        "spring.datasource.username=${TEST_DATABASE_USERNAME:postgres}",
        "spring.datasource.password=${TEST_DATABASE_PASSWORD:}",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.sql.init.mode=never",
        "jwt.secret=test-only-secret-with-at-least-32-bytes"
})
class DemoApplicationTests {
    @Autowired PersonaService personas;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach void prepararBaseDesechable() throws Exception {
        jdbc.execute(new ClassPathResource("schema.sql").getContentAsString(StandardCharsets.UTF_8));
        jdbc.execute("TRUNCATE TABLE persona, catalogo_ocupacion, catalogo_parentesco RESTART IDENTITY CASCADE");
        jdbc.update("INSERT INTO catalogo_parentesco(id,nombre) VALUES (1,'Amigo')");
    }
    private FormularioDTO formulario(int cantidad) {
        FormularioDTO d = new FormularioDTO();
        d.setNombre("Titular"); d.setApellido("Prueba");
        d.setFechaNacimiento(LocalDate.of(1990,1,1)); d.setOcupacion("Docente");
        d.setEmail("uno@example.com"); d.setCorreosAdicionales(List.of("dos@example.com"));
        d.setTelefono("5511111111"); d.setTelefonosAdicionales(List.of("5522222222"));
        d.setContactosEmergencia(java.util.stream.IntStream.range(0,cantidad)
                .mapToObj(i -> new ContactoDTO(null,"Contacto "+i,"Apellido","5533333333",1L,null)).toList());
        return d;
    }
    private ContactoDTO existente(long id) { return new ContactoDTO(id,null,null,null,1L,null); }
    private int count(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table,Integer.class); }

    @Test void persisteCuatroContactosComoPersonasYListaSoloTitular() {
        var d = personas.guardar(formulario(4));
        assertEquals(5,count("persona"));
        assertEquals(4,count("persona_contacto_emergencia"));
        assertEquals(1,personas.obtenerTodos().size());
        assertEquals(4,personas.obtenerContactos(d.getId()).size());
        assertTrue(jdbc.queryForObject("SELECT es_titular FROM persona WHERE id=?",Boolean.class,d.getId()));
        assertEquals(4,jdbc.queryForObject("SELECT count(*) FROM persona WHERE NOT es_titular",Integer.class));
    }
    @Test void contactoCompartidoSobreviveARetirarUnaRelacion() {
        var a=personas.guardar(formulario(2));
        Long compartido=a.getContactosEmergencia().getFirst().idContacto();
        var otro=formulario(1); otro.setContactosEmergencia(List.of(existente(compartido)));
        var b=personas.guardar(otro);
        assertEquals(4,count("persona"));
        personas.guardarContactos(a.getId(),List.of(existente(a.getContactosEmergencia().get(1).idContacto())));
        assertEquals(4,count("persona"));
        assertEquals(compartido,personas.obtenerContactos(b.getId()).getFirst().idContacto());
        assertEquals(2,count("persona_contacto_emergencia"));
    }
    @Test void repetirPutConIDsNoDuplicaPersonasNiRelaciones() {
        var d=personas.guardar(formulario(3));
        personas.guardarContactos(d.getId(),d.getContactosEmergencia());
        personas.guardarContactos(d.getId(),d.getContactosEmergencia());
        assertEquals(4,count("persona")); assertEquals(3,count("persona_contacto_emergencia"));
    }
    @Test void falloPosteriorRevierteNuevasPersonasYOcupacion() {
        var d=formulario(2);
        d.setContactosEmergencia(List.of(d.getContactosEmergencia().getFirst(),existente(99999)));
        assertThrows(ResponseStatusException.class,()->personas.guardar(d));
        assertEquals(0,count("persona")); assertEquals(0,count("catalogo_ocupacion"));
        assertEquals(0,count("persona_telefono"));
    }
    @Test void falloPutRevierteCambioDeRelaciones() {
        var d=personas.guardar(formulario(2));
        assertThrows(ResponseStatusException.class,()->personas.guardarContactos(d.getId(),
                List.of(new ContactoDTO(null,"Nuevo","Apellido","5544444444",1L,null),existente(99999))));
        assertEquals(3,count("persona")); assertEquals(2,personas.obtenerContactos(d.getId()).size());
    }
    @Test void restriccionesSqlRechazanAutorreferenciaYDuplicado() {
        var d=personas.guardar(formulario(1));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update(
                "INSERT INTO persona_contacto_emergencia(id_persona,id_contacto,id_parentesco) VALUES (?,?,1)",d.getId(),d.getId()));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update(
                "INSERT INTO persona_contacto_emergencia(id_persona,id_contacto,id_parentesco) VALUES (?,?,1)",d.getId(),d.getContactosEmergencia().getFirst().idContacto()));
    }
    @Test void bajaTitularNoEliminaContactoCompartido() {
        var a=personas.guardar(formulario(1));
        personas.eliminarLogico(a.getId());
        assertEquals(0,personas.obtenerTodos().size()); assertEquals(2,count("persona"));
    }
}
