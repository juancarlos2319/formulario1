-- =========================================================
-- SCRIPT DE INSERCIÓN DE DATOS INICIALES
-- =========================================================

-- 1. Insertar Catálogo con 7 Ocupaciones
INSERT INTO catalogo_ocupacion (id, nombre) VALUES
                                                (1, 'Ingeniero de Software'),
                                                (2, 'Administrador del Sistema'),
                                                (3, 'Médico Cirujano'),
                                                (4, 'Diseñador Gráfico'),
                                                (5, 'Contador Público'),
                                                (6, 'Docente Universitario'),
                                                (7, 'Abogado')
    ON CONFLICT (id) DO NOTHING;

-- Sincronizar secuencia de ID para ocupaciones
SELECT setval('catalogo_ocupacion_id_seq', (SELECT MAX(id) FROM catalogo_ocupacion));

-- 2. Insertar Datos Personales para los 2 Usuarios Administradores
INSERT INTO persona (id, nombre, apellido, fecha_nacimiento, genero, direccion, ciudad, id_ocupacion, fecha_baja) VALUES
                                                                                                                      (1, 'Carlos', 'Gómez', '1990-03-15', 'Masculino', 'Av. Revolución #101', 'Pachuca', 2, NULL),
                                                                                                                      (2, 'Laura', 'Martínez', '1993-08-22', 'Femenino', 'Calle Allende #202', 'Pachuca', 2, NULL)
    ON CONFLICT (id) DO NOTHING;

-- Sincronizar secuencia de ID para personas
SELECT setval('persona_id_seq', (SELECT MAX(id) FROM persona));

-- 3. Correos para los Administradores (Hasta 2 por usuario)
INSERT INTO persona_correo (id_persona, correo) VALUES
                                                    (1, 'carlos.admin@sistema.com'),
                                                    (1, 'carlos.soporte@sistema.com'),
                                                    (2, 'laura.admin@sistema.com')
    ON CONFLICT DO NOTHING;

-- 4. Teléfonos para los Administradores (Hasta 2 por usuario)
INSERT INTO persona_telefono (id_persona, telefono) VALUES
                                                        (1, '7711234567'),
                                                        (1, '7711234568'),
                                                        (2, '7719876543')
    ON CONFLICT DO NOTHING;

-- 5. Contactos de Emergencia para los Administradores
INSERT INTO contacto_emergencia (id_persona, nombre, telefono, parentesco) VALUES
                                                                               (1, 'Soporte TI', '7710000001', 'Empresa'),
                                                                               (2, 'Soporte TI', '7710000002', 'Empresa')
    ON CONFLICT DO NOTHING;

-- 6. Usuarios para Login (Contraseña encriptada para 'admin123')
INSERT INTO usuario (id, username, password, rol, id_persona) VALUES
                                                                  (1, 'admin1', '$2a$10$e8W/9s5L5kI2j/4z3Y1PceVvN3HjV1G8Qk0t3J2x4k5l6m7n8o9p2', 'ROLE_ADMIN', 1),
                                                                  (2, 'admin2', '$2a$10$e8W/9s5L5kI2j/4z3Y1PceVvN3HjV1G8Qk0t3J2x4k5l6m7n8o9p2', 'ROLE_ADMIN', 2)
    ON CONFLICT (id) DO NOTHING;

-- Sincronizar secuencia de ID para usuarios
SELECT setval('usuario_id_seq', (SELECT MAX(id) FROM usuario));