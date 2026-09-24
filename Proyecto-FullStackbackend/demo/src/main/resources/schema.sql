-- =========================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS Y TABLAS
-- =========================================================

-- 1. Catálogo de Ocupaciones
CREATE TABLE IF NOT EXISTS catalogo_ocupacion (
                                                  id BIGSERIAL PRIMARY KEY,
                                                  nombre VARCHAR(100) NOT NULL UNIQUE
    );

-- 2. Catálogo de Parentescos
CREATE TABLE IF NOT EXISTS catalogo_parentesco (
                                                   id BIGSERIAL PRIMARY KEY,
                                                   nombre VARCHAR(50) NOT NULL UNIQUE
    );

-- 3. Datos Principales de la Persona
--    (aplica tanto para titulares como para contactos de emergencia)
CREATE TABLE IF NOT EXISTS persona (
                                       id BIGSERIAL PRIMARY KEY,
                                       nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero VARCHAR(50),
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    id_ocupacion BIGINT,
    fecha_baja DATE, -- NULL = activo; cualquier fecha = baja lógica
    es_titular BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_persona_ocupacion FOREIGN KEY (id_ocupacion) REFERENCES catalogo_ocupacion(id)
    );

-- 4. Contactos de Emergencia (relación N a N entre personas)
--    id_persona  = titular
--    id_contacto = persona que actúa como su contacto de emergencia
CREATE TABLE IF NOT EXISTS persona_contacto_emergencia (
                                                           id BIGSERIAL PRIMARY KEY,
                                                           id_persona BIGINT NOT NULL,
                                                           id_contacto BIGINT NOT NULL,
                                                           id_parentesco BIGINT NOT NULL,
                                                           CONSTRAINT fk_pce_persona FOREIGN KEY (id_persona) REFERENCES persona(id) ON DELETE CASCADE,
    CONSTRAINT fk_pce_contacto FOREIGN KEY (id_contacto) REFERENCES persona(id) ON DELETE CASCADE,
    CONSTRAINT fk_pce_parentesco FOREIGN KEY (id_parentesco) REFERENCES catalogo_parentesco(id),
    CONSTRAINT uq_pce_par UNIQUE (id_persona, id_contacto),
    CONSTRAINT ck_pce_distintos CHECK (id_persona <> id_contacto)
    );

CREATE INDEX IF NOT EXISTS idx_pce_persona ON persona_contacto_emergencia(id_persona);
CREATE INDEX IF NOT EXISTS idx_pce_contacto ON persona_contacto_emergencia(id_contacto);

-- 5. Correos de la Persona (Relación 1 a N)
CREATE TABLE IF NOT EXISTS persona_correo (
                                              id BIGSERIAL PRIMARY KEY,
                                              id_persona BIGINT NOT NULL,
                                              correo VARCHAR(150) NOT NULL,
    CONSTRAINT fk_correo_persona FOREIGN KEY (id_persona) REFERENCES persona(id) ON DELETE CASCADE
    );

-- 6. Teléfonos de la Persona (Relación 1 a N)
CREATE TABLE IF NOT EXISTS persona_telefono (
                                                id BIGSERIAL PRIMARY KEY,
                                                id_persona BIGINT NOT NULL,
                                                telefono VARCHAR(30) NOT NULL,
    CONSTRAINT fk_telefono_persona FOREIGN KEY (id_persona) REFERENCES persona(id) ON DELETE CASCADE
    );

-- 7. Usuarios Administradores (Relación 1 a 1 con Persona)
CREATE TABLE IF NOT EXISTS usuario (
                                       id BIGSERIAL PRIMARY KEY,
                                       username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'ROLE_ADMIN',
    id_persona BIGINT NOT NULL UNIQUE,
    CONSTRAINT fk_usuario_persona FOREIGN KEY (id_persona) REFERENCES persona(id) ON DELETE CASCADE
    );
