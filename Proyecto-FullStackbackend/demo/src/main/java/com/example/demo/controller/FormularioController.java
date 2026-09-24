package com.example.demo.controller;

import com.example.demo.dto.FormularioDTO;
import com.example.demo.service.PersonaService;
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

    @GetMapping("/{id}/contactos")
    public List<com.example.demo.dto.ContactoDTO> obtenerContactos(@PathVariable Long id) {
        return personaService.obtenerContactos(id);
    }

    @PutMapping("/{id}/contactos")
    public List<com.example.demo.dto.ContactoDTO> guardarContactos(
            @PathVariable Long id, @RequestBody List<com.example.demo.dto.ContactoDTO> contactos) {
        return personaService.guardarContactos(id, contactos);
    }

    @Autowired
    private PersonaService personaService;

    @GetMapping
    public ResponseEntity<?> obtenerFormularios() {
        try {
            List<FormularioDTO> lista = personaService.obtenerTodos();
            return ResponseEntity.ok(lista);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> guardarFormulario(@RequestBody FormularioDTO dto) {
        try {
            FormularioDTO guardado = personaService.guardar(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarFormulario(@PathVariable Long id, @RequestBody FormularioDTO dto) {
        try {
            FormularioDTO actualizado = personaService.actualizar(id, dto);
            return ResponseEntity.ok(actualizado);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarFormulario(@PathVariable Long id) {
        try {
            personaService.eliminarLogico(id);
            return ResponseEntity.noContent().build();
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}
