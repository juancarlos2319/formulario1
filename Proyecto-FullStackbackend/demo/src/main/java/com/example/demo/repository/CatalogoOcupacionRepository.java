package com.example.demo.repository;

import com.example.demo.model.CatalogoOcupacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CatalogoOcupacionRepository extends JpaRepository<CatalogoOcupacion, Long> {
    Optional<CatalogoOcupacion> findByNombre(String nombre);
}