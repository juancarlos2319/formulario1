package com.example.demo.service;

import com.example.demo.dto.PersonaDTO;
import com.example.demo.model.*;
import com.example.demo.repository.CatalogoOcupacionRepository;
import com.example.demo.repository.PersonaRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PersonaService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PersonaService.class);

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.example.demo.dto.ContactoDTO> obtenerContactos(Long id) {
        return titularActivo(id).getContactosEmergencia().stream().map(this::contactoADTO).toList();
    }

    @org.springframework.transaction.annotation.Transactional
    public void guardarContactos(Long id, List<com.example.demo.dto.ContactoDTO> contactos) {
        try {
            personaRepository.bloquearContactos();
            validarContactos(contactos);
            Persona titular = titularActivo(id);
            reemplazarContactos(titular, contactos);
        } catch (RuntimeException exception) {
            LOGGER.error("No fue posible guardar los contactos de la persona {}", id, exception);
            throw exception;
        }
    }

    @Autowired
    private com.example.demo.repository.CatalogoParentescoRepository parentescoRepository;

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private CatalogoOcupacionRepository ocupacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public PersonaDTO obtenerPorId(Long id) {
        return convertirADTO(titularActivo(id));
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.example.demo.dto.PersonaResumenDTO> obtenerTodos() {
        return personaRepository.findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull().stream()
                .map(this::convertirAResumen)
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.example.demo.dto.PersonaResumenDTO> obtenerInactivos() {
        return personaRepository.findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNotNull().stream()
                .map(this::convertirAResumen)
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional
    public void reactivar(Long id) {
        Persona persona = personaRepository.findById(id)
                .filter(p -> p.getPerfilTitular() != null && p.getPerfilTitular().getFechaBaja() != null)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Persona desactivada no encontrada"));

        if (personaRepository.countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull() >= 20) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "Se alcanzó el límite de 20 personas activas");
        }

        persona.getPerfilTitular().setFechaBaja(null);
        personaRepository.save(persona);
    }

    @org.springframework.transaction.annotation.Transactional
    public Long guardar(PersonaDTO dto) {
        personaRepository.bloquearContactos();
        validarTitular(dto);
        validarContactos(dto.getContactosEmergencia());
        validarComunicacion(dto);
        // Regla de Negocio: MÃƒÂ¡ximo 20 personas activas
        long personasActivas = personaRepository.countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull();
        if (personasActivas >= 20) {
            throw new RuntimeException("LÃƒÂ­mite alcanzado: No se pueden registrar mÃƒÂ¡s de 20 personas activas en el sistema.");
        }

        Persona persona = convertirAEntidad(dto);
        Persona guardada = personaRepository.saveAndFlush(persona);
        reemplazarContactos(guardada, dto.getContactosEmergencia());
        return guardada.getId();
    }

    @org.springframework.transaction.annotation.Transactional
    public void actualizar(Long id, PersonaDTO dto) {
        validarTitular(dto);
        validarComunicacion(dto);
        Persona persona = titularActivo(id);

        persona.setNombre(dto.getNombre());
        persona.setApellido(dto.getApellido());
        persona.setFechaNacimiento(dto.getFechaNacimiento());
        persona.setGenero(dto.getGenero());
        PerfilTitular perfil = persona.getPerfilTitular();
        reemplazarDirecciones(perfil, dto);

        if (dto.getOcupacion() != null && !dto.getOcupacion().trim().isEmpty()) {
            CatalogoOcupacion ocupacion = ocupacionRepository.findByNombre(dto.getOcupacion())
                    .orElseGet(() -> {
                        CatalogoOcupacion nueva = new CatalogoOcupacion();
                        nueva.setNombre(dto.getOcupacion());
                        return ocupacionRepository.save(nueva);
                    });
            perfil.setOcupacion(ocupacion);
        }


        actualizarComunicacion(persona, dto);

        personaRepository.save(persona);
    }

    @org.springframework.transaction.annotation.Transactional
    public void eliminarLogico(Long id) {
        Persona persona = titularActivo(id);
        if (usuarioRepository.existsByIdPersonaAndRol(id, "ROLE_ADMIN")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "No se puede eliminar ni desactivar una cuenta administradora.");
        }
        persona.getPerfilTitular().setFechaBaja(LocalDate.now());
        personaRepository.save(persona);
    }

    private PersonaDTO convertirADTO(Persona p) {
        PersonaDTO dto = new PersonaDTO();
        dto.setId(p.getId());
        dto.setNombre(p.getNombre());
        dto.setApellido(p.getApellido());
        dto.setFechaNacimiento(p.getFechaNacimiento());
        dto.setGenero(p.getGenero());
        PerfilTitular perfil = p.getPerfilTitular();
        List<PersonaDTO.DireccionDTO> direcciones = perfil.getDirecciones().stream()
            .map(d -> new PersonaDTO.DireccionDTO(d.getPais(), d.getEstado(), d.getMunicipio(),
                d.getColonia(), d.getCodigoPostal(), d.getCalle(), d.getNumero()))
            .toList();
        if (direcciones.isEmpty()) direcciones = direccionesAntiguas(perfil);
        dto.setDirecciones(direcciones);
        dto.setDireccion(perfil.getDireccion());
        dto.setCiudad(perfil.getCiudad());
        dto.setFechaBaja(p.getPerfilTitular().getFechaBaja());
        dto.setOcupacion(p.getPerfilTitular().getOcupacion().getNombre());

        dto.setCorreos(p.getCorreos().stream().map(PersonaCorreo::getCorreo).toList());
        dto.setTelefonos(p.getTelefonos().stream().map(PersonaTelefono::getTelefono).toList());
        return dto;
    }

    private Persona convertirAEntidad(PersonaDTO dto) {
        Persona p = new Persona();
        p.setNombre(dto.getNombre());
        p.setApellido(dto.getApellido());
        p.setFechaNacimiento(dto.getFechaNacimiento());
        p.setGenero(dto.getGenero());

        // ValidaciÃƒÂ³n explÃƒÂ­cita de ocupaciÃƒÂ³n obligatoria
        if (dto.getOcupacion() == null || dto.getOcupacion().trim().isEmpty()) {
            throw new RuntimeException("La ocupaciÃƒÂ³n es obligatoria para registrar a la persona.");
        }

        CatalogoOcupacion ocupacion = ocupacionRepository.findByNombre(dto.getOcupacion())
                .orElseGet(() -> {
                    CatalogoOcupacion nueva = new CatalogoOcupacion();
                    nueva.setNombre(dto.getOcupacion());
                    return ocupacionRepository.save(nueva);
                });
        PerfilTitular perfil = new PerfilTitular();
        perfil.setOcupacion(ocupacion);
        reemplazarDirecciones(perfil, dto);
        p.setPerfilTitular(perfil);

        actualizarComunicacion(p, dto);

        return p;
    }

    private void validarTitular(PersonaDTO dto) {
        if (dto == null || dto.getNombre() == null || dto.getNombre().isBlank() || dto.getNombre().length() > 100 ||
                dto.getApellido() == null || dto.getApellido().isBlank() || dto.getApellido().length() > 100 ||
                dto.getFechaNacimiento() == null) {
            throw invalido("El titular requiere nombre, apellido (hasta 100 caracteres) y fecha de nacimiento");
        }
    }

    private List<PersonaDTO.DireccionDTO> direccionesDe(PersonaDTO dto) {
        if (dto.getDirecciones() != null && !dto.getDirecciones().isEmpty()) return dto.getDirecciones();
        if (dto.getDireccion() != null || dto.getCiudad() != null) {
            return List.of(new PersonaDTO.DireccionDTO("México", "", dto.getCiudad(), "", "",
                    dto.getDireccion(), ""));
        }
        throw invalido("Se requiere al menos una dirección");
    }

    private List<PersonaDTO.DireccionDTO> direccionesAntiguas(PerfilTitular perfil) {
        return List.of(new PersonaDTO.DireccionDTO("México", "", perfil.getCiudad(), "", "",
                perfil.getDireccion(), ""));
    }

        private List<PersonaDTO.DireccionDTO> convertirDirecciones(PerfilTitular perfil) {
        List<PersonaDTO.DireccionDTO> direcciones = perfil.getDirecciones().stream()
            .map(d -> new PersonaDTO.DireccionDTO(d.getPais(), d.getEstado(), d.getMunicipio(),
                d.getColonia(), d.getCodigoPostal(), d.getCalle(), d.getNumero()))
            .toList();
        return direcciones.isEmpty() ? direccionesAntiguas(perfil) : direcciones;
        }

    private void reemplazarDirecciones(PerfilTitular perfil, PersonaDTO dto) {
        List<PersonaDTO.DireccionDTO> direcciones = direccionesDe(dto);
        if (direcciones.size() > 20) throw invalido("No se pueden registrar más de 20 direcciones");
        perfil.getDirecciones().clear();
        for (int index = 0; index < direcciones.size(); index++) {
            PersonaDTO.DireccionDTO datos = direcciones.get(index);
            if (datos == null || datos.calle() == null || datos.calle().isBlank() || datos.calle().length() > 255 ||
                    datos.municipio() == null || datos.municipio().isBlank() || datos.municipio().length() > 100 ||
                    length(datos.pais()) > 100 || length(datos.estado()) > 100 || length(datos.colonia()) > 150 ||
                    length(datos.numero()) > 100 || length(datos.codigoPostal()) > 5 ||
                    (datos.codigoPostal() != null && !datos.codigoPostal().isBlank() && !datos.codigoPostal().matches("[0-9]{5}"))) {
                throw invalido("Revisa los campos de cada dirección");
            }
            DireccionTitular direccion = new DireccionTitular();
            direccion.setPerfilTitular(perfil);
            direccion.setOrden(index);
            direccion.setPais(valor(datos.pais(), "México"));
            direccion.setEstado(valor(datos.estado(), ""));
            direccion.setMunicipio(datos.municipio().trim());
            direccion.setColonia(valor(datos.colonia(), ""));
            direccion.setCodigoPostal(valor(datos.codigoPostal(), ""));
            direccion.setCalle(datos.calle().trim());
            direccion.setNumero(valor(datos.numero(), ""));
            perfil.getDirecciones().add(direccion);
        }
        PersonaDTO.DireccionDTO principal = direcciones.getFirst();
        perfil.setDireccion(formatoLegacy(principal));
        perfil.setCiudad(principal.municipio().trim());
    }

    private int length(String value) { return value == null ? 0 : value.length(); }

    private String valor(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String formatoLegacy(PersonaDTO.DireccionDTO direccion) {
        if (direccion.numero() == null || direccion.numero().isBlank()) return direccion.calle().trim();
        return direccion.calle().trim() + " #" + direccion.numero().trim() +
                (direccion.colonia() == null || direccion.colonia().isBlank() ? "" : ", Col. " + direccion.colonia().trim()) +
                (direccion.codigoPostal() == null || direccion.codigoPostal().isBlank() ? "" : ", C.P. " + direccion.codigoPostal().trim()) +
                (direccion.estado() == null || direccion.estado().isBlank() ? "" : ", " + direccion.estado().trim());
    }

    private Persona titularActivo(Long id) {
        return personaRepository.findById(id)
                .filter(p -> p.getPerfilTitular() != null && p.getPerfilTitular().getFechaBaja() == null)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Titular no encontrado"));
    }

    private org.springframework.web.server.ResponseStatusException invalido(String mensaje) {
        return new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, mensaje);
    }

    private void validarContactos(List<com.example.demo.dto.ContactoDTO> contactos) {
        if (contactos == null || contactos.isEmpty()) throw invalido("Se requiere al menos un contacto de emergencia");
        var ids = new java.util.HashSet<Long>();
        var correos = new java.util.HashSet<String>();
        var telefonos = new java.util.HashSet<String>();
        for (var c : contactos) {
            if (c == null) throw invalido("El contacto no puede ser nulo");
            if (c.idContacto() != null && (c.idContacto() <= 0 || !ids.add(c.idContacto())))
                throw invalido("Los contactos existentes deben tener IDs positivos y no repetidos");
            boolean personales = c.idContacto() == null || c.nombre() != null || c.apellido() != null ||
                    c.fechaNacimiento() != null || c.genero() != null || c.correos() != null || c.telefonos() != null;
            if (personales) {
                if (c.nombre() == null || c.nombre().isBlank() || c.nombre().length() > 100 ||
                    c.apellido() == null || c.apellido().isBlank() || c.apellido().length() > 100 ||
                    c.fechaNacimiento() == null || c.genero() == null || c.genero().isBlank())
                    throw invalido("Completa los datos personales del contacto");
                validarComunicaciones(c.correos(), c.telefonos());
                for (String correo : c.correos()) if (!correos.add(normalizarCorreo(correo)))
                    throw invalido("No repitas un correo en varios contactos");
                for (String telefono : c.telefonos()) if (!telefonos.add(telefono.trim()))
                    throw invalido("No repitas un telefono en varios contactos");
            }
            if (c.idParentesco() != null) {
                if (c.idParentesco() <= 0) throw invalido("ID de parentesco invalido");
            } else if (c.parentesco() == null || c.parentesco().isBlank() || c.parentesco().length() > 50)
                throw invalido("Se requiere un parentesco del catalogo");
        }
    }

    private CatalogoParentesco resolverParentesco(com.example.demo.dto.ContactoDTO dto) {
        return (dto.idParentesco() != null ? parentescoRepository.findById(dto.idParentesco()) :
                parentescoRepository.findByNombre(dto.parentesco().trim()))
                .orElseThrow(() -> invalido("Parentesco inexistente"));
    }

    private void reemplazarContactos(Persona titular, List<com.example.demo.dto.ContactoDTO> datos) {
        var anteriores = titular.getContactosEmergencia().stream().map(r -> r.getContacto().getId()).toList();
        var conservadas = new java.util.ArrayList<ContactoEmergencia>();
        for (var dto : datos) {
            if (dto.correos() != null) for (String correo : dto.correos()) verificarCoincidencia(correo, "", dto.idContacto());
            if (dto.telefonos() != null) for (String telefono : dto.telefonos()) verificarCoincidencia("", telefono, dto.idContacto());
            if (dto.idContacto() != null && dto.idContacto().equals(titular.getId()))
                throw invalido("Una persona no puede ser su propio contacto");
            CatalogoParentesco parentesco = resolverParentesco(dto);
            Persona contacto;
            if (dto.idContacto() != null) {
                contacto = personaRepository.findById(dto.idContacto())
                        .filter(p -> p.getPerfilTitular() == null || p.getPerfilTitular().getFechaBaja() == null)
                        .orElseThrow(() -> invalido("La persona de contacto no existe o estÃƒÂ¡ dada de baja"));
                if (dto.nombre() != null) actualizarDatosContacto(contacto, dto);
            } else {
                contacto = new Persona();
                actualizarDatosContacto(contacto, dto);
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
        titular.getContactosEmergencia().removeIf(r -> !conservadas.contains(r));
        personaRepository.saveAndFlush(titular);
        var actuales = conservadas.stream().map(r -> r.getContacto().getId()).collect(Collectors.toSet());
        anteriores.stream().filter(id -> !actuales.contains(id)).distinct()
                .forEach(personaRepository::eliminarContactoSinReferencias);
    }

    private String normalizarCorreo(String email) {
        return email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.example.demo.dto.ContactoDTO> buscarContactos(com.example.demo.dto.BusquedaContactoDTO busqueda) {
        if (busqueda == null) throw invalido("Consulta invalida");
        var correos = busqueda.correos() == null ? List.<String>of() : busqueda.correos();
        var telefonos = busqueda.telefonos() == null ? List.<String>of() : busqueda.telefonos();
        if (correos.isEmpty() && telefonos.isEmpty()) throw invalido("Escribe un correo o telefono valido");
        for (String correo : correos) if (correo == null || correo.length() > 150 ||
                !correo.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw invalido("Correo invalido");
        for (String telefono : telefonos) if (telefono == null || !telefono.matches("[0-9]{10}")) throw invalido("Telefono invalido");
        return personaRepository.buscarContactosPorComunicaciones(
                correos.isEmpty() ? List.of("") : correos.stream().map(this::normalizarCorreo).toList(),
                telefonos.isEmpty() ? List.of("") : telefonos, busqueda.excluirId()).stream()
                .map(p -> new com.example.demo.dto.ContactoDTO(p.getId(), p.getNombre(), p.getApellido(),
                    p.getFechaNacimiento(), p.getGenero(),
                    p.getCorreos().stream().map(PersonaCorreo::getCorreo).toList(),
                    p.getTelefonos().stream().map(PersonaTelefono::getTelefono).toList(), null, null))
                .toList();
    }

    private com.example.demo.dto.ContactoDTO contactoADTO(ContactoEmergencia relacion) {
        Persona contacto = relacion.getContacto();
        return new com.example.demo.dto.ContactoDTO(contacto.getId(), contacto.getNombre(), contacto.getApellido(),
                contacto.getFechaNacimiento(), contacto.getGenero(),
                contacto.getCorreos().stream().map(PersonaCorreo::getCorreo).toList(),
                contacto.getTelefonos().stream().map(PersonaTelefono::getTelefono).toList(),
                relacion.getParentesco().getId(), relacion.getParentesco().getNombre());
    }

    private void validarComunicacion(PersonaDTO dto) {
        validarComunicaciones(dto.getCorreos(), dto.getTelefonos());
    }

    private void validarComunicaciones(List<String> correos, List<String> telefonos) {
        if (correos == null || correos.isEmpty() || telefonos == null || telefonos.isEmpty())
            throw invalido("Se requiere al menos un correo y un telefono");
        var unicos = new java.util.HashSet<String>();
        for (String correo : correos) {
            if (correo == null || correo.length() > 150 || !correo.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || !unicos.add(normalizarCorreo(correo)))
                throw invalido("Los correos deben ser validos y no repetidos");
        }
        unicos.clear();
        for (String telefono : telefonos) {
            if (telefono == null || !telefono.matches("[0-9]{10}") || !unicos.add(telefono))
                throw invalido("Los telefonos deben tener diez digitos y no repetirse");
        }
    }

    private void verificarCoincidencia(String correo, String telefono, Long excluir) {
        if (!personaRepository.buscarContactos(normalizarCorreo(correo), telefono, excluir).isEmpty())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "El correo o telefono ya esta registrado. Confirma el autocompletado para reutilizar el contacto.");
    }

    private void actualizarDatosContacto(Persona persona, com.example.demo.dto.ContactoDTO dto) {
        persona.setNombre(dto.nombre().trim()); persona.setApellido(dto.apellido().trim());
        persona.setFechaNacimiento(dto.fechaNacimiento()); persona.setGenero(dto.genero().trim());
        sincronizarComunicaciones(persona, dto.correos(), dto.telefonos());
    }

    private void actualizarComunicacion(Persona persona, PersonaDTO dto) {
        sincronizarComunicaciones(persona, dto.getCorreos(), dto.getTelefonos());
    }

    private void sincronizarComunicaciones(Persona persona, List<String> correos, List<String> telefonos) {
        var correosDeseados = correos.stream().map(this::normalizarCorreo).toList();
        persona.getCorreos().removeIf(c -> !correosDeseados.contains(normalizarCorreo(c.getCorreo())));
        for (String valor : correosDeseados) {
            if (persona.getCorreos().stream().noneMatch(c -> normalizarCorreo(c.getCorreo()).equals(valor))) {
                PersonaCorreo c = new PersonaCorreo(); c.setPersona(persona); c.setCorreo(valor); persona.getCorreos().add(c);
            }
        }
        persona.getTelefonos().removeIf(t -> !telefonos.contains(t.getTelefono()));
        for (String valor : telefonos) {
            if (persona.getTelefonos().stream().noneMatch(t -> t.getTelefono().equals(valor))) {
                PersonaTelefono t = new PersonaTelefono(); t.setPersona(persona); t.setTelefono(valor); persona.getTelefonos().add(t);
            }
        }
    }

    private com.example.demo.dto.PersonaResumenDTO convertirAResumen(Persona p) {
        return new com.example.demo.dto.PersonaResumenDTO(p.getId(), p.getNombre(), p.getApellido(),
                p.getPerfilTitular().getCiudad(), p.getPerfilTitular().getOcupacion().getNombre(),
                p.getCorreos().stream().map(PersonaCorreo::getCorreo).toList(),
                p.getTelefonos().stream().map(PersonaTelefono::getTelefono).toList(), p.getFechaBaja(),
                convertirDirecciones(p.getPerfilTitular()));
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public com.example.demo.dto.ResumenDTO obtenerResumen() {
        var grupos = personaRepository.resumenPorOcupacion().stream().map(fila ->
                new com.example.demo.dto.ResumenDTO.Ocupacion((String) fila[0], ((Number) fila[1]).longValue())).toList();
        var totales = personaRepository.totalesActivos();
        Object[] fila = totales.getFirst();
        return new com.example.demo.dto.ResumenDTO(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue(),
                ((Number) fila[2]).longValue(), grupos);
    }
}
