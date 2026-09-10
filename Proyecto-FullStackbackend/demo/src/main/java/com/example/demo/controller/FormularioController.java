package com.example.demo.controller;

import com.example.demo.dto.FormularioDTO;
import com.example.demo.service.FormularioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/formularios")
@CrossOrigin(
        origins = "http://localhost:4200",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS}
)
public class FormularioController {

    @Autowired
    private FormularioService formularioService;

    @GetMapping
    public ResponseEntity<?> obtenerFormularios() {
        try {
            List<FormularioDTO> lista = formularioService.obtenerTodos();
            return ResponseEntity.ok(lista);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> guardarFormulario(@RequestBody FormularioDTO dto) {
        try {
            FormularioDTO guardado = formularioService.guardar(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarFormulario(@PathVariable Long id, @RequestBody FormularioDTO dto) {
        try {
            FormularioDTO actualizado = formularioService.actualizar(id, dto);
            return ResponseEntity.ok(actualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarFormulario(@PathVariable Long id) {
        try {
            formularioService.eliminarLogico(id);
            // Devuelve HTTP 204 No Content (respuesta vacía correcta para Angular)
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}