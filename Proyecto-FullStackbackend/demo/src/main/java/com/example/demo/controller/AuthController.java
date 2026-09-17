package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.security.JwtUtil;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil; // Clase encargada de firmar tokens con JJWT

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        // Validación de cuentas pre-sembradas
        boolean esAdmin1 = "admin1".equals(username) && "admin123".equals(password);
        boolean esAdmin2 = "admin2".equals(username) && "admin123".equals(password);

        if (esAdmin1 || esAdmin2) {
            String token = jwtUtil.generateToken(username);
            return ResponseEntity.ok(Map.of("token", token));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Usuario o contraseña incorrectos"));
    }
}