package com.example.demo.repository;

import com.example.demo.model.CatalogoParentesco;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CatalogoParentescoRepository extends JpaRepository<CatalogoParentesco, Long> {
    Optional<CatalogoParentesco> findByNombre(String nombre);
}
