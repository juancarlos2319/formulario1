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
        d.setGenero("No especificado"); d.setDireccion("Calle de prueba"); d.setCiudad("Ciudad de prueba");
        d.setFechaNacimiento(LocalDate.of(1990,1,1)); d.setOcupacion("Docente");
        d.setEmail("uno@example.com"); d.setCorreosAdicionales(List.of("dos@example.com"));
        d.setTelefono("5511111111"); d.setTelefonosAdicionales(List.of("5522222222"));
        d.setContactosEmergencia(java.util.stream.IntStream.range(0,cantidad)
                .mapToObj(i -> new ContactoDTO(null, "Contacto " + i, "Apellido", LocalDate.of(1980, 1, 1),
                    "No especificado", "contacto" + i + "@example.com", String.format("553333%04d", i), 1L, null)).toList());
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
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM perfil_titular WHERE id_persona=?",Integer.class,d.getId()));
        assertEquals(4,jdbc.queryForObject("SELECT count(*) FROM persona p WHERE NOT EXISTS (SELECT 1 FROM perfil_titular t WHERE t.id_persona=p.id)",Integer.class));
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
                List.of(new ContactoDTO(null, "Nuevo", "Apellido", LocalDate.of(1980, 1, 1),
                    "No especificado", "nuevo@example.com", "5544444444", 1L, null), existente(99999))));
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

    @Test void buscaPorCorreoNormalizadoYTelefonoSinConfundirElMismoContacto() {
        var a = personas.guardar(formulario(2));
        var contacto = a.getContactosEmergencia().getFirst();
        assertEquals(contacto.idContacto(), personas.buscarContactos(new BusquedaContactoDTO(
                "  CONTACTO0@EXAMPLE.COM ", null, null)).getFirst().idContacto());
        assertEquals(contacto.idContacto(), personas.buscarContactos(new BusquedaContactoDTO(
                null, contacto.telefono(), null)).getFirst().idContacto());
        assertTrue(personas.buscarContactos(new BusquedaContactoDTO(contacto.email(), contacto.telefono(), contacto.idContacto())).isEmpty());
    }

    @Test void noCreaDuplicadoSinConfirmacionYPermiteReutilizarId() {
        var a = personas.guardar(formulario(1));
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> personas.guardar(formulario(1))).getStatusCode().value());
        assertEquals(2, count("persona"));
        var segundo = formulario(1);
        segundo.setContactosEmergencia(List.of(existente(a.getContactosEmergencia().getFirst().idContacto())));
        personas.guardar(segundo);
        assertEquals(3, count("persona"));
        assertEquals(2, count("persona_contacto_emergencia"));
    }

    @Test void eliminaPersonaYComunicacionesSoloAlQuitarUltimaReferencia() {
        var a = personas.guardar(formulario(2));
        Long compartido = a.getContactosEmergencia().getFirst().idContacto();
        Long conservado = a.getContactosEmergencia().get(1).idContacto();
        var datosB = formulario(1);
        datosB.setContactosEmergencia(List.of(existente(compartido), existente(conservado)));
        var b = personas.guardar(datosB);
        personas.guardarContactos(a.getId(), List.of(existente(conservado)));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM persona WHERE id=?", Integer.class, compartido));
        personas.guardarContactos(b.getId(), List.of(existente(conservado)));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM persona WHERE id=?", Integer.class, compartido));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM persona_correo WHERE id_persona=?", Integer.class, compartido));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM persona_telefono WHERE id_persona=?", Integer.class, compartido));
        assertEquals(conservado, personas.obtenerContactos(a.getId()).getFirst().idContacto());
    }

    @Test void quitarContactoNoBorraSuPerfilTitular() {
        var a = personas.guardar(formulario(1));
        Long contacto = a.getContactosEmergencia().getFirst().idContacto();
        var datosB = formulario(1);
        datosB.setContactosEmergencia(List.of(existente(a.getId()), existente(contacto)));
        var b = personas.guardar(datosB);
        personas.guardarContactos(b.getId(), List.of(existente(contacto)));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM perfil_titular WHERE id_persona=?", Integer.class, a.getId()));
    }

    @Test void quitarContactoNoBorraSuCuenta() {
        var a = personas.guardar(formulario(2));
        Long contacto = a.getContactosEmergencia().getFirst().idContacto();
        jdbc.update("INSERT INTO usuario(username,password,id_persona) VALUES ('cuenta-prueba','hash-de-prueba',?)", contacto);
        personas.guardarContactos(a.getId(), List.of(existente(a.getContactosEmergencia().get(1).idContacto())));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM persona WHERE id=?", Integer.class, contacto));
        assertEquals(1, count("usuario"));
    }

    @Test void editarConCorreoDeOtraPersonaNoSobrescribeSusDatos() {
        var a = personas.guardar(formulario(2));
        var primero = a.getContactosEmergencia().getFirst();
        var segundo = a.getContactosEmergencia().get(1);
        var cambio = new ContactoDTO(primero.idContacto(), primero.nombre(), primero.apellido(),
                primero.fechaNacimiento(), primero.genero(), segundo.email(), primero.telefono(), 1L, null);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> personas.guardarContactos(a.getId(),
                List.of(cambio, existente(segundo.idContacto())))).getStatusCode().value());
        assertEquals(primero.email(), personas.obtenerContactos(a.getId()).getFirst().email());
    }
}
