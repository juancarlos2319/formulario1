package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RegistroCompletoTest {
    @Test void consultaSoloElTitularSolicitado() {
        Persona titular = persona(7, true);
        CatalogoOcupacion ocupacion = new CatalogoOcupacion();
        ocupacion.setNombre("Docente");
        titular.getPerfilTitular().setOcupacion(ocupacion);
        titular.getContactosEmergencia().add(new ContactoEmergencia());
        assertNull(service.obtenerPorId(7L).getContactosEmergencia());
        assertEquals(7L, service.obtenerPorId(7L).getId());
        verify(personas, times(2)).findById(7L);
        verify(personas, never()).findAll();
        verify(personas, never()).findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull();
    }

    @Test void consultaPorIdRechazaInexistentesContactosYTitularesInactivos() {
        persona(2, false);
        persona(3, true).setFechaBaja(LocalDate.now());
        for (long id : new long[] { 99, 2, 3 }) {
            assertEquals(404, assertThrows(ResponseStatusException.class,
                    () -> service.obtenerPorId(id)).getStatusCode().value());
        }
    }
    private final PersonaRepository personas = mock(PersonaRepository.class);
    private final CatalogoOcupacionRepository ocupaciones = mock(CatalogoOcupacionRepository.class);
    private final CatalogoParentescoRepository parentescos = mock(CatalogoParentescoRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final PersonaService service = new PersonaService();
    private final CatalogoParentesco parentesco = new CatalogoParentesco();
    private long siguienteId = 100;
    private final Map<Long, Persona> guardadas = new HashMap<>();

    private PersonaDTO guardarConDatos(PersonaDTO dto) {
        Long id = service.guardar(dto);
        PersonaDTO resultado = service.obtenerPorId(id);
        resultado.setContactosEmergencia(service.obtenerContactos(id));
        return resultado;
    }

    @BeforeEach void configurar() {
        ReflectionTestUtils.setField(service, "personaRepository", personas);
        ReflectionTestUtils.setField(service, "ocupacionRepository", ocupaciones);
        ReflectionTestUtils.setField(service, "parentescoRepository", parentescos);
        ReflectionTestUtils.setField(service, "usuarioRepository", usuarios);
        when(personas.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(guardadas.get(i.getArgument(0))));
        parentesco.setId(9L);
        parentesco.setNombre("Amigo(a)");
        when(parentescos.findById(9L)).thenReturn(Optional.of(parentesco));
        when(ocupaciones.findByNombre("Docente")).thenAnswer(i -> { CatalogoOcupacion o = new CatalogoOcupacion(); o.setNombre("Docente"); return Optional.of(o); });
        when(personas.save(any(Persona.class))).thenAnswer(i -> {
            Persona p = i.getArgument(0);
            if (p.getId() == null) p.setId(siguienteId++);
            guardadas.put(p.getId(), p);
            return p;
        });
        when(personas.saveAndFlush(any(Persona.class))).thenAnswer(i -> {
            Persona p = i.getArgument(0);
            if (p.getId() == null) p.setId(siguienteId++);
            guardadas.put(p.getId(), p);
            return p;
        });
    }

    private ContactoDTO nuevo(String nombre) {
        return new ContactoDTO(null, nombre, "PÃƒÂ©rez", LocalDate.of(1980, 1, 1), "No especificado", List.of(nombre.replace(" ", "").toLowerCase() + "@example.com"), List.of(String.format("55%08d", Math.abs(nombre.hashCode()) % 100000000)), 9L, null);
    }
    private ContactoDTO existente(long id) {
        return new ContactoDTO(id, null, null, null, null, null, null, 9L, null);
    }
    private PersonaDTO datos(int cantidad) {
        PersonaDTO dto = new PersonaDTO();
        dto.setNombre("Titular"); dto.setApellido("Prueba");
        dto.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        dto.setDireccion("Calle de prueba 1"); dto.setCiudad("Ciudad de prueba");
        dto.setCorreos(List.of("principal@example.com")); dto.setTelefonos(List.of("5512345678"));
        dto.setCorreos(List.of("principal@example.com", "secundario@example.com"));
        dto.setTelefonos(List.of("5512345678", "5587654321"));
        dto.setOcupacion("Docente");
        dto.setContactosEmergencia(java.util.stream.IntStream.range(0, cantidad).mapToObj(i -> nuevo("Contacto " + i)).toList());
        return dto;
    }
    private Persona persona(long id, boolean titular) {
        Persona p = new Persona(); p.setId(id); p.setTitular(titular);
        p.setNombre("Nombre " + id); p.setApellido("Apellido");
        when(personas.findById(id)).thenReturn(Optional.of(p));
        return p;
    }
    private ContactoEmergencia relacion(Persona titular, Persona contacto) {
        ContactoEmergencia r = new ContactoEmergencia(); r.setPersona(titular);
        r.setContacto(contacto); r.setParentesco(parentesco);
        titular.getContactosEmergencia().add(r);
        return r;
    }

    @Test void rechazaListaVaciaAntesDeEscribir() {
        assertThrows(ResponseStatusException.class, () -> guardarConDatos(datos(0)));
        verify(personas, never()).save(any()); verify(personas, never()).saveAndFlush(any());
    }

    @Test void permiteUnCorreoYUnTelefono() {
        PersonaDTO dto = datos(1);
        dto.setCorreos(List.of("uno@example.com"));
        dto.setTelefonos(List.of("5512345678"));

        PersonaDTO resultado = guardarConDatos(dto);

        assertEquals(List.of("uno@example.com"), resultado.getCorreos());
        assertEquals(List.of("5512345678"), resultado.getTelefonos());
    }

    @Test void guardaYDevuelveVariasDireccionesDelTitular() {
        PersonaDTO dto = datos(1);
        dto.setDirecciones(List.of(
                new PersonaDTO.DireccionDTO("México", "Hidalgo", "Pachuca", "Centro", "42000", "Calle Uno", "10"),
                new PersonaDTO.DireccionDTO("México", "Hidalgo", "Mineral de la Reforma", "La Providencia", "42186", "Calle Dos", "20A")
        ));

        PersonaDTO resultado = guardarConDatos(dto);

        assertEquals(2, resultado.getDirecciones().size());
        assertEquals("42000", resultado.getDirecciones().get(0).codigoPostal());
        assertEquals("42186", resultado.getDirecciones().get(1).codigoPostal());
        assertEquals(2, guardadas.get(resultado.getId()).getPerfilTitular().getDirecciones().size());
    }

    @Test void requiereUnaDireccionYValidaElCodigoPostalCuandoSeProporciona() {
        PersonaDTO sinDirecciones = datos(1);
        sinDirecciones.setDirecciones(List.of());
        sinDirecciones.setDireccion(null);
        sinDirecciones.setCiudad(null);
        PersonaDTO cpInvalido = datos(1);
        cpInvalido.setDirecciones(List.of(new PersonaDTO.DireccionDTO(
                "México", "Hidalgo", "Pachuca", "Centro", "4200", "Calle Uno", "10")));

        assertThrows(ResponseStatusException.class, () -> service.guardar(sinDirecciones));
        assertThrows(ResponseStatusException.class, () -> service.guardar(cpInvalido));
        verify(personas, never()).saveAndFlush(any());
    }

    @Test void guardaTodosLosCorreosYTelefonosRecibidos() {
        PersonaDTO dto = datos(1);
        List<String> correos = List.of("uno@example.com", "dos@example.com", "tres@example.com");
        List<String> telefonos = List.of("5511111111", "5522222222", "5533333333", "5544444444");
        dto.setCorreos(correos);
        dto.setTelefonos(telefonos);

        PersonaDTO resultado = guardarConDatos(dto);

        assertEquals(correos, resultado.getCorreos());
        assertEquals(telefonos, resultado.getTelefonos());
        assertEquals(3, guardadas.get(resultado.getId()).getCorreos().size());
        assertEquals(4, guardadas.get(resultado.getId()).getTelefonos().size());
    }

    @Test void rechazaComunicacionesVaciasORepetidasAntesDeGuardar() {
        PersonaDTO sinCorreo = datos(1);
        sinCorreo.setCorreos(List.of());
        PersonaDTO sinTelefono = datos(1);
        sinTelefono.setTelefonos(List.of());
        PersonaDTO correoRepetido = datos(1);
        correoRepetido.setCorreos(List.of("igual@example.com", " IGUAL@example.com "));
        PersonaDTO telefonoRepetido = datos(1);
        telefonoRepetido.setTelefonos(List.of("5512345678", "5512345678"));

        for (PersonaDTO dto : List.of(sinCorreo, sinTelefono, correoRepetido, telefonoRepetido)) {
            assertThrows(ResponseStatusException.class, () -> guardarConDatos(dto));
        }

        verify(personas, never()).saveAndFlush(any());
    }
    @Test void permiteUnContactoYDevuelveIdentidadCompleta() {
        PersonaDTO resultado = guardarConDatos(datos(1));
        assertEquals(1, resultado.getContactosEmergencia().size());
        assertNotNull(resultado.getContactosEmergencia().getFirst().idContacto());
        assertEquals("PÃƒÂ©rez", resultado.getContactosEmergencia().getFirst().apellido());
        assertEquals("Amigo(a)", resultado.getContactosEmergencia().getFirst().parentesco());
    }
    @Test void permiteMasDeDosContactosSinContarlosComoTitulares() {
        PersonaDTO resultado = guardarConDatos(datos(4));
        assertEquals(4, resultado.getContactosEmergencia().size());
        verify(personas, times(4)).save(argThat(p -> !p.isTitular() && p.getTelefonos().size() == 1));
        verify(personas, times(2)).saveAndFlush(argThat(p -> p.isTitular() && p.getCorreos().size() == 2));
        verify(personas).countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull();
        assertEquals(List.of("secundario@example.com"), resultado.getCorreos().subList(1, resultado.getCorreos().size()));
    }
    @Test void editarPersonaCompartidaActualizaSusDatosPersonales() {
        Persona a = persona(1, true), b = persona(2, true), c = persona(3, false);
        c.setNombre("Nombre original");
        c.setApellido("Apellido original");
        c.setFechaNacimiento(LocalDate.of(1980, 1, 1));
        c.setGenero("No especificado");
        service.guardarContactos(1L, List.of(existente(3)));
        service.guardarContactos(2L, List.of(new ContactoDTO(3L, "No sobrescribir", "Otro", LocalDate.of(2000, 1, 1), "Otro", List.of("otro@example.com"), List.of("0000000000"), 9L, null)));
        assertSame(c, a.getContactosEmergencia().getFirst().getContacto());
        assertSame(c, b.getContactosEmergencia().getFirst().getContacto());
        assertEquals("No sobrescribir", c.getNombre());
        assertEquals("Otro", c.getApellido());
        assertEquals(LocalDate.of(2000, 1, 1), c.getFechaNacimiento());
        assertEquals("Otro", c.getGenero());
        assertEquals("otro@example.com", c.getCorreos().getFirst().getCorreo());
        assertEquals("0000000000", c.getTelefonos().getFirst().getTelefono());
        verify(personas, never()).save(c);
    }
    @Test void reemplazarQuitaSoloRelacionYSostieneLasConservadas() {
        Persona a = persona(1, true), b = persona(2, false), c = persona(3, false);
        relacion(a,b); ContactoEmergencia conservada = relacion(a,c);
        service.guardarContactos(1L, List.of(existente(3)));
        assertEquals(List.of(conservada), a.getContactosEmergencia());
        verify(personas).eliminarContactoSinReferencias(2L);
        verify(personas, never()).eliminarContactoSinReferencias(3L);
    }
    @Test void rechazaAutorreferencia() {
        persona(1,true);
        assertThrows(ResponseStatusException.class, () -> service.guardarContactos(1L,List.of(existente(1))));
        verify(personas, never()).saveAndFlush(any());
    }
    @Test void rechazaIDsDuplicados() {
        assertThrows(ResponseStatusException.class, () -> service.guardarContactos(1L,List.of(existente(3),existente(3))));
        verify(personas, never()).findById(any());
    }
    @Test void rechazaPersonaInexistenteOBaja() {
        persona(1,true); persona(3,false).setFechaBaja(LocalDate.now());
        assertThrows(ResponseStatusException.class, () -> service.guardarContactos(1L,List.of(existente(99))));
        assertThrows(ResponseStatusException.class, () -> service.guardarContactos(1L,List.of(existente(3))));
    }
    @Test void rechazaParentescoInexistente() {
        persona(1,true);
        assertThrows(ResponseStatusException.class, () -> service.guardarContactos(1L,
                List.of(new ContactoDTO(null, "Ana", "PÃƒÂ©rez", null, null, null, List.of("5511111111"), 99L, null))));
        verify(personas, never()).save(any());
    }
    @Test void exigeApellidoParaNuevaPersonaContacto() {
        var dto = datos(1);
        dto.setContactosEmergencia(List.of(new ContactoDTO(null, "Ana", null, null, null, null, List.of("5511111111"), 9L, null)));
        assertThrows(ResponseStatusException.class, () -> guardarConDatos(dto));
    }
    @Test void contactoNoSePuedeEditarComoTitular() {
        persona(3,false);
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.actualizar(3L,datos(1))).getStatusCode().value());
        assertThrows(ResponseStatusException.class, () -> service.eliminarLogico(3L));
    }

    @Test void noPermiteDarDeBajaUnaPersonaConCuentaAdministradora() {
        Persona titular = persona(1, true);
        when(usuarios.existsByIdPersonaAndRol(1L, "ROLE_ADMIN")).thenReturn(true);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.eliminarLogico(1L));

        assertEquals(403, error.getStatusCode().value());
        assertEquals("No se puede eliminar ni desactivar una cuenta administradora.", error.getReason());
        assertNull(titular.getPerfilTitular().getFechaBaja());
        verify(personas, never()).save(any());
    }

    @Test void permiteDarDeBajaUnaPersonaSinCuentaAdministradora() {
        Persona titular = persona(2, true);
        when(usuarios.existsByIdPersonaAndRol(2L, "ROLE_ADMIN")).thenReturn(false);

        service.eliminarLogico(2L);

        assertNotNull(titular.getPerfilTitular().getFechaBaja());
        verify(personas).save(titular);
    }

    @Test void conserva404AlIntentarDarDeBajaUnaPersonaInexistente() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.eliminarLogico(99L));

        assertEquals(404, error.getStatusCode().value());
        verify(usuarios, never()).existsByIdPersonaAndRol(anyLong(), anyString());
        verify(personas, never()).save(any());
    }
    @Test void listaSoloTitulares() {
        Persona titular = persona(1,true);
        CatalogoOcupacion ocupacion = new CatalogoOcupacion();
        ocupacion.setNombre("Docente");
        titular.getPerfilTitular().setOcupacion(ocupacion);
        when(personas.findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull()).thenReturn(List.of(titular));
        assertEquals(1,service.obtenerTodos().size());
        verify(personas).findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull();
    }
    @Test void limiteVeinteTitulares() {
        when(personas.countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull()).thenReturn(20L);
        assertThrows(RuntimeException.class, () -> guardarConDatos(datos(1)));
        verify(personas, never()).save(any());
    }

    @Test void reactivaTitularDesactivadoSiHayCupo() {
        Persona desactivada = persona(4, true);
        desactivada.getPerfilTitular().setFechaBaja(LocalDate.now());
        CatalogoOcupacion ocupacion = new CatalogoOcupacion();
        ocupacion.setNombre("Docente");
        desactivada.getPerfilTitular().setOcupacion(ocupacion);
        when(personas.countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull()).thenReturn(19L);

        service.reactivar(4L);
        PersonaDTO resultado = service.obtenerPorId(4L);

        assertNull(desactivada.getPerfilTitular().getFechaBaja());
        assertEquals(4L, resultado.getId());
        verify(personas).save(desactivada);
    }

    @Test void rechazaReactivacionCuandoSeAlcanzoElLimite() {
        Persona desactivada = persona(4, true);
        desactivada.getPerfilTitular().setFechaBaja(LocalDate.now());
        when(personas.countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull()).thenReturn(20L);

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.reactivar(4L));

        assertEquals(409, error.getStatusCode().value());
        assertNotNull(desactivada.getPerfilTitular().getFechaBaja());
        verify(personas, never()).save(any());
    }
    @Test void rechazaTelefonoSecundarioInvalido() {
        PersonaDTO dto=datos(1); dto.setTelefonos(List.of("5512345678", "123"));
        assertThrows(ResponseStatusException.class, () -> guardarConDatos(dto));
        verify(personas, never()).save(any());
    }
}

