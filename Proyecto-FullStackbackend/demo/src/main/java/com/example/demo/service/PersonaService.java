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
        return titularActivo(id).getContactosEmergencia().stream().map(this::contactoADTO).toList();
    }

    @org.springframework.transaction.annotation.Transactional
    public List<com.example.demo.dto.ContactoDTO> guardarContactos(Long id, List<com.example.demo.dto.ContactoDTO> contactos) {
        validarContactos(contactos);
        Persona titular = titularActivo(id);
        reemplazarContactos(titular, contactos);
        personaRepository.saveAndFlush(titular);
        return titular.getContactosEmergencia().stream().map(this::contactoADTO).toList();
    }

    @Autowired
    private com.example.demo.repository.CatalogoParentescoRepository parentescoRepository;

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private CatalogoOcupacionRepository ocupacionRepository;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<FormularioDTO> obtenerTodos() {
        return personaRepository.findByTitularTrueAndFechaBajaIsNull().stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional
    public FormularioDTO guardar(FormularioDTO dto) {
        validarTitular(dto);
        validarContactos(dto.getContactosEmergencia());
        validarComunicacion(dto);
        // Regla de Negocio: Máximo 20 personas activas
        long personasActivas = personaRepository.countByTitularTrueAndFechaBajaIsNull();
        if (personasActivas >= 20) {
            throw new RuntimeException("Límite alcanzado: No se pueden registrar más de 20 personas activas en el sistema.");
        }

        Persona persona = convertirAEntidad(dto);
        persona.setTitular(true);
        reemplazarContactos(persona, dto.getContactosEmergencia());
        Persona guardada = personaRepository.saveAndFlush(persona);
        return convertirADTO(guardada);
    }

    @org.springframework.transaction.annotation.Transactional
    public FormularioDTO actualizar(Long id, FormularioDTO dto) {
        validarTitular(dto);
        validarComunicacion(dto);
        Persona persona = titularActivo(id);

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

    @org.springframework.transaction.annotation.Transactional
    public void eliminarLogico(Long id) {
        Persona persona = titularActivo(id);
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

        List<com.example.demo.dto.ContactoDTO> contactos = p.getContactosEmergencia().stream()
                .map(this::contactoADTO).toList();
        dto.setContactosEmergencia(contactos);
        if (!contactos.isEmpty()) {
            dto.setContactoEmergenciaNombre(contactos.get(0).nombre());
            dto.setContactoEmergenciaTelefono(contactos.get(0).telefono());
            dto.setContactoEmergenciaParentesco(contactos.get(0).parentesco());
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

    private void validarTitular(FormularioDTO dto) {
        if (dto == null || dto.getNombre() == null || dto.getNombre().isBlank() || dto.getNombre().length() > 100 ||
                dto.getApellido() == null || dto.getApellido().isBlank() || dto.getApellido().length() > 100 ||
                dto.getFechaNacimiento() == null) {
            throw invalido("El titular requiere nombre, apellido (hasta 100 caracteres) y fecha de nacimiento");
        }
    }

    private Persona titularActivo(Long id) {
        return personaRepository.findById(id)
                .filter(p -> p.isTitular() && p.getFechaBaja() == null)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Titular no encontrado"));
    }

    private org.springframework.web.server.ResponseStatusException invalido(String mensaje) {
        return new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, mensaje);
    }

    private void validarContactos(List<com.example.demo.dto.ContactoDTO> contactos) {
        if (contactos == null || contactos.isEmpty()) throw invalido("Se requiere al menos un contacto de emergencia");
        java.util.Set<Long> ids = new java.util.HashSet<>();
        for (var c : contactos) {
            if (c == null) throw invalido("El contacto no puede ser nulo");
            if (c.idContacto() != null) {
                if (c.idContacto() <= 0 || !ids.add(c.idContacto()))
                    throw invalido("Los contactos existentes deben tener IDs positivos y no repetidos");
            } else if (c.nombre() == null || c.nombre().isBlank() || c.nombre().length() > 100 ||
                    c.apellido() == null || c.apellido().isBlank() || c.apellido().length() > 100 ||
                    c.telefono() == null || !c.telefono().matches("[0-9]{10}")) {
                throw invalido("El nuevo contacto requiere nombre y apellido de hasta 100 caracteres y teléfono de 10 dígitos");
            }
            if (c.idParentesco() != null) {
                if (c.idParentesco() <= 0) throw invalido("ID de parentesco inválido");
            } else if (c.parentesco() == null || c.parentesco().isBlank() || c.parentesco().length() > 50) {
                throw invalido("Se requiere un parentesco del catálogo");
            }
        }
    }

    private CatalogoParentesco resolverParentesco(com.example.demo.dto.ContactoDTO dto) {
        return (dto.idParentesco() != null ? parentescoRepository.findById(dto.idParentesco()) :
                parentescoRepository.findByNombre(dto.parentesco().trim()))
                .orElseThrow(() -> invalido("Parentesco inexistente"));
    }

    private void reemplazarContactos(Persona titular, List<com.example.demo.dto.ContactoDTO> datos) {
        var conservadas = new java.util.ArrayList<ContactoEmergencia>();
        for (var dto : datos) {
            if (dto.idContacto() != null && dto.idContacto().equals(titular.getId()))
                throw invalido("Una persona no puede ser su propio contacto");
            CatalogoParentesco parentesco = resolverParentesco(dto);
            Persona contacto;
            if (dto.idContacto() != null) {
                contacto = personaRepository.findById(dto.idContacto())
                        .filter(p -> p.getFechaBaja() == null)
                        .orElseThrow(() -> invalido("La persona de contacto no existe o está dada de baja"));
                // Un ID reutiliza la persona; no modifica sus datos compartidos desde esta relación.
            } else {
                contacto = new Persona();
                contacto.setTitular(false);
                contacto.setNombre(dto.nombre().trim());
                contacto.setApellido(dto.apellido().trim());
                PersonaTelefono telefono = new PersonaTelefono();
                telefono.setPersona(contacto);
                telefono.setTelefono(dto.telefono());
                contacto.getTelefonos().add(telefono);
                contacto = personaRepository.save(contacto);
            }
            Persona personaContacto = contacto;
            ContactoEmergencia relacion = titular.getContactosEmergencia().stream()
                    .filter(r -> dto.idContacto() != null && dto.idContacto().equals(r.getContacto().getId()))
                    .findFirst().orElseGet(() -> {
                        ContactoEmergencia nueva = new ContactoEmergencia();
                        nueva.setPersona(titular);
                        nueva.setContacto(personaContacto);
                        titular.getContactosEmergencia().add(nueva);
                        return nueva;
                    });
            relacion.setParentesco(parentesco);
            conservadas.add(relacion);
        }
        // orphanRemoval elimina únicamente relaciones, nunca personas compartidas.
        titular.getContactosEmergencia().removeIf(r -> !conservadas.contains(r));
    }

    private com.example.demo.dto.ContactoDTO contactoADTO(ContactoEmergencia relacion) {
        Persona contacto = relacion.getContacto();
        String telefono = contacto.getTelefonos().isEmpty() ? null : contacto.getTelefonos().get(0).getTelefono();
        return new com.example.demo.dto.ContactoDTO(contacto.getId(), contacto.getNombre(), contacto.getApellido(),
                telefono, relacion.getParentesco().getId(), relacion.getParentesco().getNombre());
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
