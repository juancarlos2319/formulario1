package com.example.demo.repository;

import com.example.demo.model.Formulario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FormularioRepository extends JpaRepository<Formulario, Long> {
    // Método para consultar únicamente los usuarios activos
    List<Formulario> findByActivoTrue();
}