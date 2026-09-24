INSERT INTO catalogo_ocupacion (id, nombre) VALUES
(1, 'Ingeniero de Software'), (2, 'Administrador del Sistema'), (3, 'Medico Cirujano'),
(4, 'Disenador Grafico'), (5, 'Contador Publico'), (6, 'Docente Universitario'), (7, 'Abogado')
ON CONFLICT (id) DO NOTHING;
INSERT INTO catalogo_parentesco (id, nombre) VALUES
(1, 'Padre'), (2, 'Madre'), (3, 'Hermano(a)'), (4, 'Conyuge'), (5, 'Hijo(a)'),
(6, 'Abuelo(a)'), (7, 'Tio(a)'), (8, 'Primo(a)'), (9, 'Amigo(a)'), (10, 'Empresa'), (11, 'Otro')
ON CONFLICT (id) DO NOTHING;

-- Administradores y contactos: toda persona inicia con datos personales completos.
INSERT INTO persona (id, nombre, apellido, fecha_nacimiento, genero) VALUES
(1, 'Carlos', 'Gomez', '1990-03-15', 'Masculino'),
(2, 'Laura', 'Martinez', '1993-08-22', 'Femenino'),
(3, 'Andrea', 'Hernandez', '1968-11-02', 'Femenino'),
(4, 'Miguel', 'Santos', '1985-06-19', 'Masculino'),
(5, 'Sofia', 'Ramirez', '1975-02-27', 'Femenino'),
(6, 'Daniel', 'Ortega', '1970-09-12', 'Masculino')
ON CONFLICT (id) DO NOTHING;
INSERT INTO perfil_titular (id_persona, direccion, ciudad, id_ocupacion, fecha_baja) VALUES
(1, 'Av. Revolucion 101', 'Pachuca', 2, NULL), (2, 'Calle Allende 202', 'Pachuca', 2, NULL)
ON CONFLICT (id_persona) DO NOTHING;
INSERT INTO persona_correo (id_persona, correo) VALUES
(1, 'carlos.admin@sistema.com'), (1, 'carlos.soporte@sistema.com'),
(2, 'laura.admin@sistema.com'), (2, 'laura.soporte@sistema.com'),
(3, 'andrea.hernandez@email.com'), (4, 'miguel.santos@email.com'),
(5, 'sofia.ramirez@email.com'), (6, 'daniel.ortega@email.com')
ON CONFLICT DO NOTHING;
INSERT INTO persona_telefono (id_persona, telefono) VALUES
(1, '7711234567'), (1, '7711234568'), (2, '7719876543'), (2, '7719876544'),
(3, '7714000001'), (4, '7714000002'), (5, '7714000003'), (6, '7714000004')
ON CONFLICT DO NOTHING;
INSERT INTO persona_contacto_emergencia (id_persona, id_contacto, id_parentesco) VALUES
(1, 3, 2), (1, 4, 9), (2, 5, 3), (2, 6, 1)
ON CONFLICT DO NOTHING;
INSERT INTO usuario (id, username, password, rol, id_persona) VALUES
(1, 'admin1', '$2a$10$ZFWFlxEZakU8XcWCdAZBD.0CskpNHK12BJtt7Lfp9oQiilrm61296', 'ROLE_ADMIN', 1),
(2, 'admin2', '$2a$10$e8W/9s5L5kI2j/4z3Y1PceVvN3HjV1G8Qk0t3J2x4k5l6m7n8o9p2', 'ROLE_ADMIN', 2)
ON CONFLICT (id) DO NOTHING;
SELECT setval('persona_id_seq', (SELECT MAX(id) FROM persona));
