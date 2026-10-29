package com.example.demo.repository;

import com.example.demo.model.CatalogoParentesco;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CatalogoParentescoRepository extends JpaRepository<CatalogoParentesco, Long> {
    /** Busca un parentesco por su nombre exacto. */
    Optional<CatalogoParentesco> findByNombre(String nombre);
}
