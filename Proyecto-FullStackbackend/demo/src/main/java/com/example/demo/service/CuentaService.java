package com.example.demo.service;

import com.example.demo.dto.UsuarioActualDTO;
import com.example.demo.dto.EditarCuentaDTO;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import com.example.demo.model.Persona;
import com.example.demo.model.Usuario;
import com.example.demo.repository.PersonaRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CuentaService {
    private final UsuarioRepository usuarioRepository;
    private final PersonaRepository personaRepository;
    private final PasswordEncoder passwordEncoder;

    public CuentaService(UsuarioRepository usuarioRepository, PersonaRepository personaRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.personaRepository = personaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, String> obtenerDatosLogin(String username) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada"));
        return java.util.Map.of("username", usuario.getUsername());
    }

    @Transactional
    public void actualizarLogin(String autenticado, EditarCuentaDTO datos) {
        Usuario usuario = usuarioRepository.findByUsername(autenticado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada"));
        String nuevoUsuario = datos.username() == null ? "" : datos.username().trim();
        if (nuevoUsuario.isEmpty() || nuevoUsuario.length() > 255 || nuevoUsuario.chars().anyMatch(Character::isWhitespace)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El usuario debe tener entre 1 y 255 caracteres, sin espacios.");
        }
        if (datos.passwordActual() == null || !passwordEncoder.matches(datos.passwordActual(), usuario.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta.");
        }
        String nueva = datos.passwordNueva();
        if (nueva != null && !nueva.isEmpty() && (nueva.length() < 8 || nueva.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña nueva debe tener al menos 8 caracteres y un máximo de 72 bytes.");
        }
        usuarioRepository.findByUsername(nuevoUsuario).filter(otra -> !otra.getId().equals(usuario.getId())).ifPresent(otra -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese nombre de usuario ya está registrado.");
        });
        usuario.setUsername(nuevoUsuario);
        if (nueva != null && !nueva.isEmpty()) usuario.setPassword(passwordEncoder.encode(nueva));
        try {
            usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese nombre de usuario ya está registrado.");
        }
    }

    @Transactional(readOnly = true)
    public UsuarioActualDTO obtenerUsuarioActual(String username) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada"));
        Persona persona = personaRepository.findById(usuario.getIdPersona())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Persona de la cuenta no encontrada"));
        String correo = persona.getCorreos().stream()
                .findFirst()
                .map(contacto -> contacto.getCorreo())
                .orElse(null);
        String nombreCompleto = String.join(" ", persona.getNombre(), persona.getApellido());
        return new UsuarioActualDTO(nombreCompleto, correo);
    }
}
