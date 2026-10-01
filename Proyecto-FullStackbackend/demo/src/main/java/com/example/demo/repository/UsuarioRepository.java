package com.example.demo.repository;

import com.example.demo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    boolean existsByIdPersonaAndRol(Long idPersona, String rol);
    @org.springframework.data.jpa.repository.Query("select u.idPersona from Usuario u where u.rol = :rol and u.idPersona in :ids")
    java.util.Set<Long> buscarPersonasConRol(@org.springframework.data.repository.query.Param("ids") java.util.Collection<Long> ids,
                                           @org.springframework.data.repository.query.Param("rol") String rol);
}
