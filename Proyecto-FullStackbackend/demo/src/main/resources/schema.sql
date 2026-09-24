CREATE TABLE IF NOT EXISTS catalogo_ocupacion (id BIGSERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS catalogo_parentesco (id BIGSERIAL PRIMARY KEY, nombre VARCHAR(50) NOT NULL UNIQUE);

-- Datos compartidos por titulares, contactos y administradores.
CREATE TABLE IF NOT EXISTS persona (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(50) NOT NULL
);

-- Solo existe para personas registradas como titulares.
CREATE TABLE IF NOT EXISTS perfil_titular (
    id_persona BIGINT PRIMARY KEY REFERENCES persona(id) ON DELETE CASCADE,
    direccion VARCHAR(255) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    id_ocupacion BIGINT NOT NULL REFERENCES catalogo_ocupacion(id),
    fecha_baja DATE
);

CREATE TABLE IF NOT EXISTS persona_correo (
    id BIGSERIAL PRIMARY KEY,
    id_persona BIGINT NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
    correo VARCHAR(150) NOT NULL,
    CONSTRAINT uq_persona_correo UNIQUE (id_persona, correo)
);
CREATE TABLE IF NOT EXISTS persona_telefono (
    id BIGSERIAL PRIMARY KEY,
    id_persona BIGINT NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
    telefono VARCHAR(10) NOT NULL CHECK (telefono ~ '^[0-9]{10}$'),
    CONSTRAINT uq_persona_telefono UNIQUE (id_persona, telefono)
);
CREATE TABLE IF NOT EXISTS persona_contacto_emergencia (
    id BIGSERIAL PRIMARY KEY,
    id_persona BIGINT NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
    id_contacto BIGINT NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
    id_parentesco BIGINT NOT NULL REFERENCES catalogo_parentesco(id),
    CONSTRAINT uq_pce_par UNIQUE (id_persona, id_contacto),
    CONSTRAINT ck_pce_distintos CHECK (id_persona <> id_contacto)
);
CREATE INDEX IF NOT EXISTS idx_pce_persona ON persona_contacto_emergencia(id_persona);
CREATE TABLE IF NOT EXISTS usuario (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'ROLE_ADMIN',
    id_persona BIGINT NOT NULL UNIQUE REFERENCES persona(id) ON DELETE CASCADE
);
