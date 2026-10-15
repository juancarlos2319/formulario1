package com.example.demo.controller;

import com.example.demo.dto.PersonaDTO;
import com.example.demo.dto.PersonaResumenDTO;
import com.example.demo.dto.ResultadoDTO;
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
    /** Consulta coincidencias por comunicaciones antes de reutilizar una persona. */
    @PostMapping("/contactos/coincidencias")
    public List<com.example.demo.dto.ContactoDTO> buscarContactos(
            @RequestBody com.example.demo.dto.BusquedaContactoDTO busqueda) {
        return personaService.buscarContactos(busqueda);
    }

    /** Devuelve los contactos del titular y añade la duración de la consulta al header. */
    @GetMapping("/{id}/contactos")
    public ResponseEntity<List<com.example.demo.dto.ContactoDTO>> obtenerContactos(@PathVariable Long id) {
        long inicio = System.nanoTime();
        List<com.example.demo.dto.ContactoDTO> contactos = personaService.obtenerContactos(id);
        double milisegundos = (System.nanoTime() - inicio) / 1_000_000.0;
        return ResponseEntity.ok()
                .header("Server-Timing", String.format(java.util.Locale.ROOT, "contactos;dur=%.2f", milisegundos))
                .body(contactos);
    }

    /** Sustituye la lista de vínculos del titular y devuelve confirmación. */
    @PutMapping("/{id}/contactos")
    public ResultadoDTO guardarContactos(
            @PathVariable Long id, @RequestBody List<com.example.demo.dto.ContactoDTO> contactos) {
        personaService.guardarContactos(id, contactos);
        return new ResultadoDTO(true);
    }

    @Autowired
    private PersonaService personaService;

    /** Devuelve los agregados de titulares activos para el dashboard. */
    @GetMapping("/resumen")
    public com.example.demo.dto.ResumenDTO obtenerResumen() {
        return personaService.obtenerResumen();
    }

    /** Devuelve el listado resumido de titulares dados de baja. */
    @GetMapping("/inactivos")
    public ResponseEntity<List<PersonaResumenDTO>> obtenerInactivos() {
        return ResponseEntity.ok(personaService.obtenerInactivos());
    }

    /** Devuelve solo los datos adicionales usados al desplegar detalles. */
    @GetMapping("/{id}/detalles")
    public com.example.demo.dto.PersonaDetalleDTO obtenerDetalle(@PathVariable Long id) {
        return personaService.obtenerDetalle(id);
    }

    /** Devuelve los datos completos del titular activo para editar su formulario. */
    @GetMapping("/{id}")
    public PersonaDTO obtenerPorId(@PathVariable Long id) {
        return personaService.obtenerPorId(id);
    }

    /** Solicita la reactivación y conserva los errores de negocio en la respuesta HTTP. */
    @PutMapping("/{id}/reactivar")
    public ResponseEntity<?> reactivar(@PathVariable Long id) {
        try {
            personaService.reactivar(id);
            return ResponseEntity.ok(new ResultadoDTO(true));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        }
    }

    /** Devuelve el listado resumido de activos y traduce los errores a HTTP. */
    @GetMapping
    public ResponseEntity<?> obtenerPersonas() {
        try {
            List<PersonaResumenDTO> lista = personaService.obtenerTodos();
            return ResponseEntity.ok(lista);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    /** Registra titular y contactos juntos; devuelve 201 si la operación se completa. */
    @PostMapping
    public ResponseEntity<?> guardarPersona(@RequestBody PersonaDTO dto) {
        try {
            personaService.guardar(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(new ResultadoDTO(true));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /** Actualiza el titular indicado y traduce los errores según el contrato HTTP. */
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarPersona(@PathVariable Long id, @RequestBody PersonaDTO dto) {
        try {
            personaService.actualizar(id, dto);
            return ResponseEntity.ok(new ResultadoDTO(true));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /** Aplica la baja lógica y devuelve 204 sin cuerpo cuando se completa. */
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
