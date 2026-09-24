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
    private final PersonaRepository personas = mock(PersonaRepository.class);
    private final CatalogoOcupacionRepository ocupaciones = mock(CatalogoOcupacionRepository.class);
    private final CatalogoParentescoRepository parentescos = mock(CatalogoParentescoRepository.class);
    private final PersonaService service = new PersonaService();
    private final CatalogoParentesco parentesco = new CatalogoParentesco();
    private long siguienteId = 100;

    @BeforeEach void configurar() {
        ReflectionTestUtils.setField(service, "personaRepository", personas);
        ReflectionTestUtils.setField(service, "ocupacionRepository", ocupaciones);
        ReflectionTestUtils.setField(service, "parentescoRepository", parentescos);
        parentesco.setId(9L);
        parentesco.setNombre("Amigo(a)");
        when(parentescos.findById(9L)).thenReturn(Optional.of(parentesco));
        when(ocupaciones.findByNombre("Docente")).thenReturn(Optional.of(new CatalogoOcupacion()));
        when(personas.save(any(Persona.class))).thenAnswer(i -> {
            Persona p = i.getArgument(0);
            if (p.getId() == null) p.setId(siguienteId++);
            return p;
        });
        when(personas.saveAndFlush(any(Persona.class))).thenAnswer(i -> {
            Persona p = i.getArgument(0);
            if (p.getId() == null) p.setId(siguienteId++);
            return p;
        });
    }

    private ContactoDTO nuevo(String nombre) {
        return new ContactoDTO(null, nombre, "PÃƒÂ©rez", "5511111111", 9L, null);
    }
    private ContactoDTO existente(long id) {
        return new ContactoDTO(id, null, null, null, 9L, null);
    }
    private FormularioDTO datos(int cantidad) {
        FormularioDTO dto = new FormularioDTO();
        dto.setNombre("Titular"); dto.setApellido("Prueba");
        dto.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        dto.setEmail("principal@example.com"); dto.setTelefono("5512345678");
        dto.setCorreosAdicionales(List.of("secundario@example.com"));
        dto.setTelefonosAdicionales(List.of("5587654321"));
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
        assertThrows(ResponseStatusException.class, () -> service.guardar(datos(0)));
        verify(personas, never()).save(any()); verify(personas, never()).saveAndFlush(any());
    }
    @Test void permiteUnContactoYDevuelveIdentidadCompleta() {
        FormularioDTO resultado = service.guardar(datos(1));
        assertEquals(1, resultado.getContactosEmergencia().size());
        assertNotNull(resultado.getContactosEmergencia().getFirst().idContacto());
        assertEquals("PÃƒÂ©rez", resultado.getContactosEmergencia().getFirst().apellido());
        assertEquals("Amigo(a)", resultado.getContactosEmergencia().getFirst().parentesco());
    }
    @Test void permiteMasDeDosContactosSinContarlosComoTitulares() {
        FormularioDTO resultado = service.guardar(datos(4));
        assertEquals(4, resultado.getContactosEmergencia().size());
        verify(personas, times(4)).save(argThat(p -> !p.isTitular() && p.getTelefonos().size() == 1));
        verify(personas).saveAndFlush(argThat(p -> p.isTitular() && p.getCorreos().size() == 2));
        verify(personas).countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull();
        assertEquals(List.of("secundario@example.com"), resultado.getCorreosAdicionales());
    }
    @Test void compartePersonaEntreTitularesYActualizaSusDatos() {
        Persona a = persona(1, true), b = persona(2, true), c = persona(3, false);
        service.guardarContactos(1L, List.of(existente(3)));
        service.guardarContactos(2L, List.of(new ContactoDTO(3L, "No sobrescribir", "Otro", "0000000000", 9L, null)));
        assertSame(c, a.getContactosEmergencia().getFirst().getContacto());
        assertSame(c, b.getContactosEmergencia().getFirst().getContacto());
        assertEquals("No sobrescribir", c.getNombre());
        verify(personas, never()).save(c);
    }
    @Test void reemplazarQuitaSoloRelacionYSostieneLasConservadas() {
        Persona a = persona(1, true), b = persona(2, false), c = persona(3, false);
        relacion(a,b); ContactoEmergencia conservada = relacion(a,c);
        service.guardarContactos(1L, List.of(existente(3)));
        assertEquals(List.of(conservada), a.getContactosEmergencia());
        verify(personas, never()).delete(any());
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
                List.of(new ContactoDTO(null,"Ana","PÃƒÂ©rez","5511111111",99L,null))));
        verify(personas, never()).save(any());
    }
    @Test void exigeApellidoParaNuevaPersonaContacto() {
        var dto = datos(1);
        dto.setContactosEmergencia(List.of(new ContactoDTO(null,"Ana",null,"5511111111",9L,null)));
        assertThrows(ResponseStatusException.class, () -> service.guardar(dto));
    }
    @Test void contactoNoSePuedeEditarComoTitular() {
        persona(3,false);
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.actualizar(3L,datos(1))).getStatusCode().value());
        assertThrows(ResponseStatusException.class, () -> service.eliminarLogico(3L));
    }
    @Test void listaSoloTitulares() {
        Persona titular = persona(1,true);
        when(personas.findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull()).thenReturn(List.of(titular));
        assertEquals(1,service.obtenerTodos().size());
        verify(personas).findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull();
    }
    @Test void limiteVeinteTitulares() {
        when(personas.countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull()).thenReturn(20L);
        assertThrows(RuntimeException.class, () -> service.guardar(datos(1)));
        verify(personas, never()).save(any());
    }
    @Test void rechazaTelefonoSecundarioInvalido() {
        FormularioDTO dto=datos(1); dto.setTelefonosAdicionales(List.of("123"));
        assertThrows(IllegalArgumentException.class, () -> service.guardar(dto));
        verify(personas, never()).save(any());
    }
}

