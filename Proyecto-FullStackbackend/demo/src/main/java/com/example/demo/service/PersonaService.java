package com.example.demo.service;

import com.example.demo.dto.FormularioDTO;
import com.example.demo.model.*;
import com.example.demo.repository.CatalogoOcupacionRepository;
import com.example.demo.repository.PersonaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PersonaService {

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.example.demo.dto.ContactoDTO> obtenerContactos(Long id) {
        Persona persona = personaRepository.findById(id)
                .filter(p -> p.getFechaBaja() == null)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Persona no encontrada"));
        return persona.getContactosEmergencia().stream()
                .map(c -> new com.example.demo.dto.ContactoDTO(c.getNombre(), c.getTelefono(), c.getParentesco()))
                .toList();
    }

    @org.springframework.transaction.annotation.Transactional
    public List<com.example.demo.dto.ContactoDTO> guardarContactos(Long id, List<com.example.demo.dto.ContactoDTO> contactos) {
        validarContactos(contactos);
        Persona persona = personaRepository.findById(id)
                .filter(p -> p.getFechaBaja() == null)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Persona no encontrada"));
        var existentes = persona.getContactosEmergencia();
        for (int i = 0; i < 2; i++) {
            ContactoEmergencia contacto;
            if (i < existentes.size()) contacto = existentes.get(i);
            else {
                contacto = new ContactoEmergencia();
                contacto.setPersona(persona);
                existentes.add(contacto);
            }
            contacto.setNombre(contactos.get(i).nombre().trim());
            contacto.setTelefono(contactos.get(i).telefono());
            contacto.setParentesco(contactos.get(i).parentesco().trim());
        }
        personaRepository.save(persona);
        return contactos;
    }

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private CatalogoOcupacionRepository ocupacionRepository;

    public List<FormularioDTO> obtenerTodos() {
        return personaRepository.findByFechaBajaIsNull().stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional
    public FormularioDTO guardar(FormularioDTO dto) {
        validarContactos(dto.getContactosEmergencia());
        validarComunicacion(dto);
        // Regla de Negocio: Máximo 20 personas activas
        long personasActivas = personaRepository.countByFechaBajaIsNull();
        if (personasActivas >= 20) {
            throw new RuntimeException("Límite alcanzado: No se pueden registrar más de 20 personas activas en el sistema.");
        }

        Persona persona = convertirAEntidad(dto);
        for (var datos : dto.getContactosEmergencia()) {
            ContactoEmergencia contacto = new ContactoEmergencia();
            contacto.setPersona(persona);
            contacto.setNombre(datos.nombre().trim());
            contacto.setTelefono(datos.telefono());
            contacto.setParentesco(datos.parentesco().trim());
            persona.getContactosEmergencia().add(contacto);
        }
        Persona guardada = personaRepository.saveAndFlush(persona);
        return convertirADTO(guardada);
    }

    @org.springframework.transaction.annotation.Transactional
    public FormularioDTO actualizar(Long id, FormularioDTO dto) {
        validarComunicacion(dto);
        Persona persona = personaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registro no encontrado con el ID: " + id));

        persona.setNombre(dto.getNombre());
        persona.setApellido(dto.getApellido());
        persona.setFechaNacimiento(dto.getFechaNacimiento());
        persona.setGenero(dto.getGenero());
        persona.setDireccion(dto.getDireccion());
        persona.setCiudad(dto.getCiudad());

        if (dto.getOcupacion() != null && !dto.getOcupacion().trim().isEmpty()) {
            CatalogoOcupacion ocupacion = ocupacionRepository.findByNombre(dto.getOcupacion())
                    .orElseGet(() -> {
                        CatalogoOcupacion nueva = new CatalogoOcupacion();
                        nueva.setNombre(dto.getOcupacion());
                        return ocupacionRepository.save(nueva);
                    });
            persona.setOcupacion(ocupacion);
        }


        actualizarComunicacion(persona, dto);

        Persona actualizada = personaRepository.save(persona);
        return convertirADTO(actualizada);
    }

    public void eliminarLogico(Long id) {
        Persona persona = personaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registro no encontrado con el ID: " + id));
        persona.setFechaBaja(LocalDate.now());
        personaRepository.save(persona);
    }

    private FormularioDTO convertirADTO(Persona p) {
        FormularioDTO dto = new FormularioDTO();
        dto.setId(p.getId());
        dto.setNombre(p.getNombre());
        dto.setApellido(p.getApellido());
        dto.setFechaNacimiento(p.getFechaNacimiento());
        dto.setGenero(p.getGenero());
        dto.setDireccion(p.getDireccion());
        dto.setCiudad(p.getCiudad());
        dto.setFechaBaja(p.getFechaBaja());

        if (p.getOcupacion() != null) {
            dto.setOcupacion(p.getOcupacion().getNombre());
        }

        if (p.getContactoEmergencia() != null) {
            dto.setContactoEmergenciaNombre(p.getContactoEmergencia().getNombre());
            dto.setContactoEmergenciaTelefono(p.getContactoEmergencia().getTelefono());
            dto.setContactoEmergenciaParentesco(p.getContactoEmergencia().getParentesco());
        }

        if (p.getCorreos() != null && !p.getCorreos().isEmpty()) {
            dto.setEmail(p.getCorreos().get(0).getCorreo());
        }

        if (p.getTelefonos() != null && !p.getTelefonos().isEmpty()) {
            dto.setTelefono(p.getTelefonos().get(0).getTelefono());
        }

        dto.setCorreosAdicionales(p.getCorreos().stream().skip(1).map(PersonaCorreo::getCorreo).toList());
        dto.setTelefonosAdicionales(p.getTelefonos().stream().skip(1).map(PersonaTelefono::getTelefono).toList());
        return dto;
    }

    private Persona convertirAEntidad(FormularioDTO dto) {
        Persona p = new Persona();
        p.setNombre(dto.getNombre());
        p.setApellido(dto.getApellido());
        p.setFechaNacimiento(dto.getFechaNacimiento());
        p.setGenero(dto.getGenero());
        p.setDireccion(dto.getDireccion());
        p.setCiudad(dto.getCiudad());

        // Validación explícita de ocupación obligatoria
        if (dto.getOcupacion() == null || dto.getOcupacion().trim().isEmpty()) {
            throw new RuntimeException("La ocupación es obligatoria para registrar a la persona.");
        }

        CatalogoOcupacion ocupacion = ocupacionRepository.findByNombre(dto.getOcupacion())
                .orElseGet(() -> {
                    CatalogoOcupacion nueva = new CatalogoOcupacion();
                    nueva.setNombre(dto.getOcupacion());
                    return ocupacionRepository.save(nueva);
                });
        p.setOcupacion(ocupacion);

        actualizarComunicacion(p, dto);

        return p;
    }

    private void validarContactos(List<com.example.demo.dto.ContactoDTO> contactos) {
        if (contactos == null || contactos.size() != 2 || contactos.stream().anyMatch(c ->
                c == null || c.nombre() == null || c.nombre().isBlank() || c.nombre().length() > 150 ||
                c.telefono() == null || !c.telefono().matches("[0-9]{10}") ||
                c.parentesco() == null || c.parentesco().isBlank() || c.parentesco().length() > 50)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Se requieren dos contactos completos con teléfonos de 10 dígitos");
        }
    }

    private void validarComunicacion(FormularioDTO dto) {
        if (dto.getCorreosAdicionales() == null || dto.getCorreosAdicionales().size() != 1 ||
            dto.getTelefonosAdicionales() == null || dto.getTelefonosAdicionales().size() != 1) {
            throw new IllegalArgumentException("Se requieren un correo y un teléfono secundarios.");
        }
        for (String correo : new String[]{dto.getEmail(), dto.getCorreosAdicionales().get(0)}) {
            if (correo == null || correo.length() > 150 || !correo.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                throw new IllegalArgumentException("Los dos correos deben ser válidos.");
            }
        }
        for (String telefono : new String[]{dto.getTelefono(), dto.getTelefonosAdicionales().get(0)}) {
            if (telefono == null || !telefono.matches("[0-9]{10}")) {
                throw new IllegalArgumentException("Los dos teléfonos deben tener 10 dígitos.");
            }
        }
    }

    private void actualizarComunicacion(Persona persona, FormularioDTO dto) {
        String[] correos = {dto.getEmail(), dto.getCorreosAdicionales().get(0)};
        String[] telefonos = {dto.getTelefono(), dto.getTelefonosAdicionales().get(0)};
        for (int i = 0; i < 2; i++) {
            if (persona.getCorreos().size() <= i) {
                PersonaCorreo correo = new PersonaCorreo();
                correo.setPersona(persona);
                persona.getCorreos().add(correo);
            }
            persona.getCorreos().get(i).setCorreo(correos[i]);
            if (persona.getTelefonos().size() <= i) {
                PersonaTelefono telefono = new PersonaTelefono();
                telefono.setPersona(persona);
                persona.getTelefonos().add(telefono);
            }
            persona.getTelefonos().get(i).setTelefono(telefonos[i]);
        }
    }
}
