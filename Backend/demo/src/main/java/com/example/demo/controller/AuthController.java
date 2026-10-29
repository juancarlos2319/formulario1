package com.example.demo.controller;

import com.example.demo.model.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.security.JwtUtil;
import com.example.demo.dto.UsuarioActualDTO;
import com.example.demo.service.CuentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private CuentaService cuentaService;

    /** Devuelve nombre y correo de la cuenta identificada por el JWT. */
    @GetMapping("/me")
    public UsuarioActualDTO obtenerUsuarioActual(Authentication authentication) {
        return cuentaService.obtenerUsuarioActual(authentication.getName());
    }

    /** Devuelve el username de la cuenta autenticada para su edición. */
    @GetMapping("/me/login")
    public Map<String, String> obtenerDatosLogin(Authentication authentication) {
        return cuentaService.obtenerDatosLogin(authentication.getName());
    }

    /** Delega el cambio de credenciales y devuelve una confirmación de guardado. */
    @PutMapping("/me/login")
    public com.example.demo.dto.ResultadoDTO actualizarLogin(Authentication authentication,
            @RequestBody com.example.demo.dto.EditarCuentaDTO datos) {
        cuentaService.actualizarLogin(authentication.getName(), datos);
        return new com.example.demo.dto.ResultadoDTO(true);
    }

    /** Busca la cuenta, compara BCrypt y devuelve el JWT y los datos del perfil. */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String rawPassword = request.get("password");

        Usuario user = usuarioRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Usuario no encontrado"));
        }

        boolean coincide = passwordEncoder.matches(rawPassword, user.getPassword());

        if (!coincide) {
            return ResponseEntity.status(401).body(Map.of("message", "Credenciales incorrectas"));
        }

        if (!"ROLE_ADMIN".equals(user.getRol())) {
            return ResponseEntity.status(403).body(Map.of("message", "La cuenta no tiene permisos de administración"));
        }

        // Genera el token JWT usando el JwtUtil que tienes en el proyecto
        String token = jwtUtil.generateToken(user.getUsername());

        return ResponseEntity.ok(Map.of(
                "message", "Login exitoso",
                "username", user.getUsername(),
                "token", token,
                "usuarioActual", cuentaService.obtenerUsuarioActual(user.getUsername())
        ));
    }
}
