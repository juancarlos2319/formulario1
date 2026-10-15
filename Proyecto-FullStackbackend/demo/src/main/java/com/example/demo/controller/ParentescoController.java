package com.example.demo.controller;

import com.example.demo.model.CatalogoParentesco;
import com.example.demo.repository.CatalogoParentescoRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/parentescos")
@CrossOrigin(origins = "http://localhost:4200")
public class ParentescoController {
    private final CatalogoParentescoRepository parentescos;

    /** Recibe el repositorio utilizado para consultar el catálogo de parentescos. */
    public ParentescoController(CatalogoParentescoRepository parentescos) {
        this.parentescos = parentescos;
    }

    /** Devuelve los parentescos ordenados por identificador. */
    @GetMapping
    public List<CatalogoParentesco> obtenerTodos() {
        return parentescos.findAll(org.springframework.data.domain.Sort.by("id"));
    }
}
