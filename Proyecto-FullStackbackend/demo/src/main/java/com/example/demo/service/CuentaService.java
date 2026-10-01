package com.example.demo.service;

import com.example.demo.dto.UsuarioActualDTO;
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

    public CuentaService(UsuarioRepository usuarioRepository, PersonaRepository personaRepository) {
        this.usuarioRepository = usuarioRepository;
        this.personaRepository = personaRepository;
    }

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