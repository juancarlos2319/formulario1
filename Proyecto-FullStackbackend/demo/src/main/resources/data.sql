-- =========================================================
-- SCRIPT DE INSERCIÓN DE DATOS INICIALES
-- =========================================================

-- 1. Catálogo de Ocupaciones
INSERT INTO catalogo_ocupacion (id, nombre) VALUES
                                                (1, 'Ingeniero de Software'),
                                                (2, 'Administrador del Sistema'),
                                                (3, 'Médico Cirujano'),
                                                (4, 'Diseñador Gráfico'),
                                                (5, 'Contador Público'),
                                                (6, 'Docente Universitario'),
                                                (7, 'Abogado')
    ON CONFLICT (id) DO NOTHING;

SELECT setval('catalogo_ocupacion_id_seq', (SELECT MAX(id) FROM catalogo_ocupacion));

-- 2. Catálogo de Parentescos
INSERT INTO catalogo_parentesco (id, nombre) VALUES
                                                 (1, 'Padre'),
                                                 (2, 'Madre'),
                                                 (3, 'Hermano(a)'),
                                                 (4, 'Cónyuge'),
                                                 (5, 'Hijo(a)'),
                                                 (6, 'Abuelo(a)'),
                                                 (7, 'Tío(a)'),
                                                 (8, 'Primo(a)'),
                                                 (9, 'Amigo(a)'),
                                                 (10, 'Empresa'),
                                                 (11, 'Otro')
    ON CONFLICT (id) DO NOTHING;

SELECT setval('catalogo_parentesco_id_seq', (SELECT MAX(id) FROM catalogo_parentesco));

-- 3. Personas: 2 administradores + 2 contactos de emergencia
INSERT INTO persona (id, nombre, apellido, fecha_nacimiento, genero, direccion, ciudad, id_ocupacion, fecha_baja, es_titular) VALUES
                                                                                                                      (1, 'Carlos', 'Gómez', '1990-03-15', 'Masculino', 'Av. Revolución #101', 'Pachuca', 2, NULL, TRUE),
                                                                                                                      (2, 'Laura', 'Martínez', '1993-08-22', 'Femenino', 'Calle Allende #202', 'Pachuca', 2, NULL, TRUE),
                                                                                                                      (3, 'Soporte TI', '(Carlos)', NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
                                                                                                                      (4, 'Soporte TI', '(Laura)', NULL, NULL, NULL, NULL, NULL, NULL, FALSE)
    ON CONFLICT (id) DO NOTHING;

SELECT setval('persona_id_seq', (SELECT MAX(id) FROM persona));

-- 4. Correos de los administradores
INSERT INTO persona_correo (id_persona, correo) VALUES
                                                    (1, 'carlos.admin@sistema.com'),
                                                    (1, 'carlos.soporte@sistema.com'),
                                                    (2, 'laura.admin@sistema.com');

-- 5. Teléfonos (administradores y contactos de emergencia)
INSERT INTO persona_telefono (id_persona, telefono) VALUES
                                                        (1, '7711234567'),
                                                        (1, '7711234568'),
                                                        (2, '7719876543'),
                                                        (3, '7710000001'),
                                                        (4, '7710000002');

-- 6. Relación de contactos de emergencia (titular -> contacto -> parentesco)
INSERT INTO persona_contacto_emergencia (id_persona, id_contacto, id_parentesco) VALUES
                                                                                     (1, 3, 10),
                                                                                     (2, 4, 10)
    ON CONFLICT (id_persona, id_contacto) DO NOTHING;

-- 7. Usuarios para Login
INSERT INTO usuario (id, username, password, rol, id_persona) VALUES
                                                                  (1, 'admin1', '$2a$10$ZFWFlxEZakU8XcWCdAZBD.0CskpNHK12BJtt7Lfp9oQiilrm61296', 'ROLE_ADMIN', 1),
                                                                  (2, 'admin2', '$2a$10$e8W/9s5L5kI2j/4z3Y1PceVvN3HjV1G8Qk0t3J2x4k5l6m7n8o9p2', 'ROLE_ADMIN', 2)
    ON CONFLICT (id) DO NOTHING;

SELECT setval('usuario_id_seq', (SELECT MAX(id) FROM usuario));