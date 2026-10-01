package com.example.demo.repository;

import com.example.demo.model.Persona;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface PersonaRepository extends JpaRepository<Persona, Long> {
    @Query(value = """
        SELECT count(*),
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM persona_correo c WHERE c.id_persona = t.id_persona)),
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM persona_telefono f WHERE f.id_persona = t.id_persona))
        FROM perfil_titular t WHERE t.fecha_baja IS NULL
        """, nativeQuery = true)
    List<Object[]> totalesActivos();

    @Query(value = """
        SELECT o.nombre, count(*) FROM perfil_titular t
        JOIN catalogo_ocupacion o ON o.id = t.id_ocupacion
        WHERE t.fecha_baja IS NULL GROUP BY o.nombre ORDER BY count(*) DESC, o.nombre LIMIT 5
        """, nativeQuery = true)
    List<Object[]> resumenPorOcupacion();
    // Serializa altas, sustituciones y limpieza de contactos dentro de la transacción.
    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(74192301)", nativeQuery = true)
    Integer bloquearContactos();

    @Query(value = """
        SELECT p.* FROM persona p
        WHERE p.id <> COALESCE(:excluir, 0)
          AND (EXISTS (SELECT 1 FROM persona_contacto_emergencia r WHERE r.id_contacto = p.id)
            OR (NOT EXISTS (SELECT 1 FROM perfil_titular t WHERE t.id_persona = p.id)
                AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_persona = p.id)))
          AND (EXISTS (SELECT 1 FROM persona_correo c WHERE c.id_persona = p.id AND lower(trim(c.correo)) = :email)
            OR EXISTS (SELECT 1 FROM persona_telefono t WHERE t.id_persona = p.id AND t.telefono = :telefono))
        ORDER BY p.id
        """, nativeQuery = true)
    List<Persona> buscarContactos(@Param("email") String email, @Param("telefono") String telefono,
                                 @Param("excluir") Long excluir);

    @Query(value = """
        SELECT p.* FROM persona p
        WHERE p.id <> COALESCE(:excluir, 0)
          AND (EXISTS (SELECT 1 FROM persona_contacto_emergencia r WHERE r.id_contacto = p.id)
            OR (NOT EXISTS (SELECT 1 FROM perfil_titular t WHERE t.id_persona = p.id)
                AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_persona = p.id)))
          AND (EXISTS (SELECT 1 FROM persona_correo c WHERE c.id_persona = p.id AND lower(trim(c.correo)) IN (:correos))
            OR EXISTS (SELECT 1 FROM persona_telefono t WHERE t.id_persona = p.id AND t.telefono IN (:telefonos)))
        ORDER BY p.id
        """, nativeQuery = true)
    List<Persona> buscarContactosPorComunicaciones(@Param("correos") List<String> correos,
            @Param("telefonos") List<String> telefonos, @Param("excluir") Long excluir);

    @Modifying
    @Query(value = """
        DELETE FROM persona p WHERE p.id = :id
          AND NOT EXISTS (SELECT 1 FROM perfil_titular t WHERE t.id_persona = p.id)
          AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_persona = p.id)
          AND NOT EXISTS (SELECT 1 FROM persona_contacto_emergencia r WHERE r.id_contacto = p.id OR r.id_persona = p.id)
        """, nativeQuery = true)
    int eliminarContactoSinReferencias(@Param("id") Long id);
    List<Persona> findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull();
    List<Persona> findByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNotNull();
    long countByPerfilTitularIsNotNullAndPerfilTitularFechaBajaIsNull();
}
