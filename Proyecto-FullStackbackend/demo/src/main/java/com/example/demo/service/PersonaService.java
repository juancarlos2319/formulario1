package com.example.demo.service;

import com.example.demo.dto.ContactoDTO;
import com.example.demo.dto.FormularioDTO;
import com.example.demo.model.*;
import com.example.demo.repository.CatalogoOcupacionRepository;
import com.example.demo.repository.PersonaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PersonaService {

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private CatalogoOcupacionRepository ocupacionRepository;

    @Transactional(readOnly = true)
    public List<ContactoDTO> obtenerContactos(Long id) {
        Persona persona = personaRepository.findById(id)
                .filter(p -> p.getFechaBaja() == null)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Persona no encontrada"));

        List<ContactoDTO> resultado = new ArrayList<>();
        if (persona.getContactosEmergencia() != null) {
            for (ContactoEmergencia c : persona.getContactosEmergencia()) {
                resultado.add(new ContactoDTO(c.getNombre(), c.getTelefono(), c.getParentesco()));
            }
        }
        return resultado;
    }

    @Transactional
    public List<ContactoDTO> guardarContactos(Long id, List<ContactoDTO> contactos) {
        if (contactos == null || contactos.size() < 2) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Se requieren los datos de 2 contactos de emergencia.");
        }

        for (ContactoDTO c : contactos) {
            if (c == null || c.getNombre() == null || c.getNombre().isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "El nombre del contacto es obligatorio.");
            }
        }

        Persona persona = personaRepository.findById(id)
                .filter(p -> p.getFechaBaja() == null)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Persona no encontrada con ID: " + id));

        List<ContactoEmergencia> existentes = persona.getContactosEmergencia();
        if (existentes == null) {
            existentes = new ArrayList<>();
            persona.setContactosEmergencia(existentes);
        }

        for (int i = 0; i < 2; i++) {
            ContactoDTO dto = contactos.get(i);
            ContactoEmergencia contacto;

            if (i < existentes.size()) {
                contacto = existentes.get(i);
            } else {
                contacto = new ContactoEmergencia();
                contacto.setPersona(persona);
                existentes.add(contacto);
            }

            contacto.setNombre(dto.getNombre() != null ? dto.getNombre().trim() : "");
            contacto.setTelefono(dto.getTelefono() != null ? dto.getTelefono().trim() : "");
            contacto.setParentesco(dto.getParentesco() != null ? dto.getParentesco().trim() : "");
        }

        personaRepository.save(persona);
        return contactos;
    }

    public List<FormularioDTO> obtenerTodos() {
        return personaRepository.findByFechaBajaIsNull().stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    public FormularioDTO guardar(FormularioDTO dto) {
        long personasActivas = personaRepository.countByFechaBajaIsNull();
        if (personasActivas >= 20) {
            throw new RuntimeException("Límite alcanzado: No se pueden registrar más de 20 personas activas.");
        }

        Persona persona = convertirAEntidad(dto);
        Persona guardada = personaRepository.save(persona);
        return convertirADTO(guardada);
    }

    public FormularioDTO actualizar(Long id, FormularioDTO dto) {
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

        if (dto.getEmail() != null && !persona.getCorreos().isEmpty()) {
            persona.getCorreos().get(0).setCorreo(dto.getEmail());
        }

        if (dto.getTelefono() != null && !persona.getTelefonos().isEmpty()) {
            persona.getTelefonos().get(0).setTelefono(dto.getTelefono());
        }

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

        if (p.getContactosEmergencia() != null && !p.getContactosEmergencia().isEmpty()) {
            ContactoEmergencia ce = p.getContactosEmergencia().get(0);
            dto.setContactoEmergenciaNombre(ce.getNombre());
            dto.setContactoEmergenciaTelefono(ce.getTelefono());
            dto.setContactoEmergenciaParentesco(ce.getParentesco());
        }

        if (p.getCorreos() != null && !p.getCorreos().isEmpty()) {
            dto.setEmail(p.getCorreos().get(0).getCorreo());
        }

        if (p.getTelefonos() != null && !p.getTelefonos().isEmpty()) {
            dto.setTelefono(p.getTelefonos().get(0).getTelefono());
        }

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

        if (dto.getContactoEmergenciaNombre() != null) {
            ContactoEmergencia ce = new ContactoEmergencia();
            ce.setPersona(p);
            ce.setNombre(dto.getContactoEmergenciaNombre());
            ce.setTelefono(dto.getContactoEmergenciaTelefono());
            ce.setParentesco(dto.getContactoEmergenciaParentesco());
            p.getContactosEmergencia().add(ce);
        }

        if (dto.getEmail() != null) {
            PersonaCorreo correo = new PersonaCorreo();
            correo.setPersona(p);
            correo.setCorreo(dto.getEmail());
            p.getCorreos().add(correo);
        }

        if (dto.getTelefono() != null) {
            PersonaTelefono tel = new PersonaTelefono();
            tel.setPersona(p);
            tel.setTelefono(dto.getTelefono());
            p.getTelefonos().add(tel);
        }

        return p;
    }
}