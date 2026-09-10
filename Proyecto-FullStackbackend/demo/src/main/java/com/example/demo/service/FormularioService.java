package com.example.demo.service;

import com.example.demo.dto.FormularioDTO;
import com.example.demo.model.Formulario;
import com.example.demo.repository.FormularioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FormularioService {

    @Autowired
    private FormularioRepository formularioRepository;

    // Convertir de Entidad a DTO
    private FormularioDTO convertToDTO(Formulario entity) {
        FormularioDTO dto = new FormularioDTO();
        dto.setId(entity.getId());
        dto.setNombre(entity.getNombre());
        dto.setApellido(entity.getApellido());
        dto.setEmail(entity.getEmail());
        dto.setTelefono(entity.getTelefono());
        dto.setFechaNacimiento(entity.getFechaNacimiento());
        dto.setGenero(entity.getGenero());
        dto.setDireccion(entity.getDireccion());
        dto.setCiudad(entity.getCiudad());
        dto.setOcupacion(entity.getOcupacion());
        dto.setAceptaTerminos(entity.getAceptaTerminos());
        dto.setActivo(entity.isActivo());

        // Contacto de Emergencia
        dto.setContactoEmergenciaNombre(entity.getContactoEmergenciaNombre());
        dto.setContactoEmergenciaTelefono(entity.getContactoEmergenciaTelefono());
        dto.setContactoEmergenciaParentesco(entity.getContactoEmergenciaParentesco());

        return dto;
    }

    // Convertir de DTO a Entidad
    private Formulario convertToEntity(FormularioDTO dto) {
        Formulario entity = new Formulario();
        if (dto.getId() != null) {
            entity.setId(dto.getId());
        }
        entity.setNombre(dto.getNombre());
        entity.setApellido(dto.getApellido());
        entity.setEmail(dto.getEmail());
        entity.setTelefono(dto.getTelefono());
        entity.setFechaNacimiento(dto.getFechaNacimiento());
        entity.setGenero(dto.getGenero());
        entity.setDireccion(dto.getDireccion());
        entity.setCiudad(dto.getCiudad());
        entity.setOcupacion(dto.getOcupacion());
        entity.setAceptaTerminos(dto.getAceptaTerminos());
        entity.setActivo(dto.getActivo() != null ? dto.getActivo() : true);

        // Contacto de Emergencia
        entity.setContactoEmergenciaNombre(dto.getContactoEmergenciaNombre());
        entity.setContactoEmergenciaTelefono(dto.getContactoEmergenciaTelefono());
        entity.setContactoEmergenciaParentesco(dto.getContactoEmergenciaParentesco());

        return entity;
    }

    public List<FormularioDTO> obtenerTodos() {
        return formularioRepository.findAll()
                .stream()
                .filter(Formulario::isActivo)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public FormularioDTO guardar(FormularioDTO dto) {
        Formulario entity = convertToEntity(dto);
        Formulario guardado = formularioRepository.save(entity);
        return convertToDTO(guardado);
    }

    public FormularioDTO actualizar(Long id, FormularioDTO dto) {
        return formularioRepository.findById(id).map(existente -> {
            existente.setNombre(dto.getNombre());
            existente.setApellido(dto.getApellido());
            existente.setEmail(dto.getEmail());
            existente.setTelefono(dto.getTelefono());
            existente.setFechaNacimiento(dto.getFechaNacimiento());
            existente.setGenero(dto.getGenero());
            existente.setDireccion(dto.getDireccion());
            existente.setCiudad(dto.getCiudad());
            existente.setOcupacion(dto.getOcupacion());

            // Contacto de Emergencia
            existente.setContactoEmergenciaNombre(dto.getContactoEmergenciaNombre());
            existente.setContactoEmergenciaTelefono(dto.getContactoEmergenciaTelefono());
            existente.setContactoEmergenciaParentesco(dto.getContactoEmergenciaParentesco());

            Formulario actualizado = formularioRepository.save(existente);
            return convertToDTO(actualizado);
        }).orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));
    }

    public void eliminarLogico(Long id) {
        formularioRepository.findById(id).ifPresent(entity -> {
            entity.setActivo(false);
            formularioRepository.save(entity);
        });
    }
}