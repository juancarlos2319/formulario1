package com.example.demo.controller;

import com.example.demo.model.Usuario;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String rawPassword = request.get("password");

        System.out.println("🔍 [LOGIN TEST] Petición recibida para usuario: " + username);

        Usuario user = usuarioRepository.findByUsername(username).orElse(null);

        if (user == null) {
            System.out.println("❌ [LOGIN TEST] Usuario NO encontrado en BD.");
            return ResponseEntity.status(404).body(Map.of("message", "Usuario no encontrado"));
        }

        System.out.println("✅ [LOGIN TEST] Usuario encontrado en BD.");

        boolean coincide = passwordEncoder.matches(rawPassword, user.getPassword());

        if (!coincide) {
            System.out.println("❌ [LOGIN TEST] La contraseña NO coincide.");
            return ResponseEntity.status(401).body(Map.of("message", "Credenciales incorrectas"));
        }

        System.out.println("🎉 [LOGIN TEST] Autenticación exitosa.");

        // Genera el token JWT usando el JwtUtil que tienes en el proyecto
        String token = jwtUtil.generateToken(user.getUsername());

        return ResponseEntity.ok(Map.of(
                "message", "Login exitoso",
                "username", user.getUsername(),
                "token", token
        ));
    }
}