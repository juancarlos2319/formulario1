package com.example.demo.controller;

import com.example.demo.repository.CatalogoOcupacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ocupaciones")
@CrossOrigin(origins = "http://localhost:4200")
public class OcupacionController {

    @Autowired
    private CatalogoOcupacionRepository catalogoOcupacionRepository;

    /** Devuelve las ocupaciones del catálogo para poblar el formulario. */
    @GetMapping
    public ResponseEntity<?> obtenerOcupaciones() {
        return ResponseEntity.ok(catalogoOcupacionRepository.findAll());
    }
}