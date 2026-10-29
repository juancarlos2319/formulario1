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
    id_ocupacion BIGINT NOT NULL REFERENCES catalogo_ocupacion(id),
    fecha_baja DATE
);

-- Direcciones de cada titular; orden 0 identifica la direccion principal.
CREATE TABLE IF NOT EXISTS direccion_titular (
    id BIGSERIAL PRIMARY KEY,
    id_persona BIGINT NOT NULL REFERENCES perfil_titular(id_persona) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    pais VARCHAR(100) NOT NULL DEFAULT 'México',
    estado VARCHAR(100) NOT NULL DEFAULT '',
    municipio VARCHAR(100) NOT NULL,
    colonia VARCHAR(150) NOT NULL DEFAULT '',
    codigo_postal VARCHAR(5) NOT NULL DEFAULT '',
    calle VARCHAR(255) NOT NULL,
    numero VARCHAR(100) NOT NULL DEFAULT '',
    CONSTRAINT ck_direccion_codigo_postal CHECK (codigo_postal = '' OR codigo_postal ~ '^[0-9]{5}$')
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
CREATE INDEX IF NOT EXISTS idx_pce_contacto ON persona_contacto_emergencia(id_contacto);
CREATE INDEX IF NOT EXISTS idx_persona_correo_busqueda ON persona_correo(lower(trim(correo)));
CREATE INDEX IF NOT EXISTS idx_persona_telefono_busqueda ON persona_telefono(telefono);
CREATE TABLE IF NOT EXISTS usuario (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'ROLE_ADMIN',
    id_persona BIGINT NOT NULL UNIQUE REFERENCES persona(id) ON DELETE CASCADE
);

-- Completa la tabla si Hibernate la creo antes de ejecutar este script.
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS id_persona BIGINT NOT NULL
        UNIQUE REFERENCES persona(id) ON DELETE CASCADE;
