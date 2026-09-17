package com.example.demo.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        // Validación temporal de credenciales de los 2 admins
        if (("admin1".equals(username) || "admin2".equals(username)) && "admin123".equals(password)) {
            // Reemplazar aquí con la generación real de tu JWT
            return ResponseEntity.ok(Map.of("token", "TOKEN_JWT_DE_PRUEBA"));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales incorrectas");
    }
}