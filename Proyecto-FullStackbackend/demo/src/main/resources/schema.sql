-- Script de creación de la tabla "formulario" en PostgreSQL

CREATE TABLE IF NOT EXISTS formulario (
                                          id BIGSERIAL PRIMARY KEY,
                                          nombre VARCHAR(100),
    apellido VARCHAR(100),
    email VARCHAR(150),
    telefono VARCHAR(30),
    fecha_nacimiento DATE,
    genero VARCHAR(50),
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    ocupacion VARCHAR(100),
    acepta_terminos BOOLEAN DEFAULT FALSE,

    -- Campos de Contacto de Emergencia
    contacto_emergencia_nombre VARCHAR(150),
    contacto_emergencia_telefono VARCHAR(30),
    contacto_emergencia_parentesco VARCHAR(50),

    -- Fecha de inactivación/baja
    -- NULL o fecha futura = Usuario ACTIVO
    -- Fecha actual o pasada = Usuario INACTIVO
    fecha_baja DATE
    );

-- Insertar datos de prueba (Opcional)
INSERT INTO formulario (
    nombre, apellido, email, telefono, fecha_nacimiento, genero,
    direccion, ciudad, ocupacion, acepta_terminos,
    contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_parentesco,
    fecha_baja
) VALUES
      ('Juan', 'Pérez', 'juan.perez@example.com', '5551234567', '1995-05-15', 'Masculino',
       'Calle Principal #123', 'Pachuca', 'Ingeniero', TRUE,
       'Maria Pérez', '5559876543', 'Hermana', NULL),

      ('Ana', 'Gómez', 'ana.gomez@example.com', '5557654321', '1998-10-20', 'Femenino',
       'Av. Juárez #456', 'Pachuca', 'Diseñadora', TRUE,
       'Carlos Gómez', '5553332211', 'Padre', '2026-01-15');