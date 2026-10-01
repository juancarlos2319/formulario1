package com.example.demo.controller;

import com.example.demo.dto.PersonaDTO;
import com.example.demo.service.PersonaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/personas")
@CrossOrigin(
        origins = "http://localhost:4200",
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS}
)
public class PersonaController {
    @PostMapping("/contactos/coincidencias")
    public List<com.example.demo.dto.ContactoDTO> buscarContactos(
            @RequestBody com.example.demo.dto.BusquedaContactoDTO busqueda) {
        return personaService.buscarContactos(busqueda);
    }

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

    @GetMapping("/inactivos")
    public ResponseEntity<List<PersonaDTO>> obtenerInactivos() {
        return ResponseEntity.ok(personaService.obtenerInactivos());
    }

    @GetMapping("/{id}")
    public PersonaDTO obtenerPorId(@PathVariable Long id) {
        return personaService.obtenerPorId(id);
    }

    @PutMapping("/{id}/reactivar")
    public ResponseEntity<?> reactivar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(personaService.reactivar(id));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        }
    }

    @GetMapping
    public ResponseEntity<?> obtenerPersonas() {
        try {
            List<PersonaDTO> lista = personaService.obtenerTodos();
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
    public ResponseEntity<?> guardarPersona(@RequestBody PersonaDTO dto) {
        try {
            PersonaDTO guardado = personaService.guardar(dto);
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
    public ResponseEntity<?> actualizarPersona(@PathVariable Long id, @RequestBody PersonaDTO dto) {
        try {
            PersonaDTO actualizado = personaService.actualizar(id, dto);
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
    public ResponseEntity<?> eliminarPersona(@PathVariable Long id) {
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
