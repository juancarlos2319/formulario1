-- =========================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS Y TABLAS
-- =========================================================

-- 1. Catálogo de Ocupaciones
CREATE TABLE IF NOT EXISTS catalogo_ocupacion (
                                                  id BIGSERIAL PRIMARY KEY,
                                                  nombre VARCHAR(100) NOT NULL UNIQUE
    );

-- 2. Datos Principales de la Persona
CREATE TABLE IF NOT EXISTS persona (
                                       id BIGSERIAL PRIMARY KEY,
                                       nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(50),
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    id_ocupacion BIGINT NOT NULL,
    fecha_baja DATE, -- NULL o futura = Activo | Pasada = Inactivo
    CONSTRAINT fk_persona_ocupacion FOREIGN KEY (id_ocupacion) REFERENCES catalogo_ocupacion(id)
    );

-- 3. Contacto de Emergencia (Relación 1 a 1)
CREATE TABLE IF NOT EXISTS contacto_emergencia (
                                                   id BIGSERIAL PRIMARY KEY,
                                                   id_persona BIGINT NOT NULL UNIQUE,
                                                   nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    CONSTRAINT fk_contacto_persona FOREIGN KEY (id_persona) REFERENCES persona(id) ON DELETE CASCADE
    );

-- 4. Correos de la Persona (Relación 1 a N)
CREATE TABLE IF NOT EXISTS persona_correo (
                                              id BIGSERIAL PRIMARY KEY,
                                              id_persona BIGINT NOT NULL,
                                              correo VARCHAR(150) NOT NULL,
    CONSTRAINT fk_correo_persona FOREIGN KEY (id_persona) REFERENCES persona(id) ON DELETE CASCADE
    );

-- 5. Teléfonos de la Persona (Relación 1 a N)
CREATE TABLE IF NOT EXISTS persona_telefono (
                                                id BIGSERIAL PRIMARY KEY,
                                                id_persona BIGINT NOT NULL,
                                                telefono VARCHAR(30) NOT NULL,
    CONSTRAINT fk_telefono_persona FOREIGN KEY (id_persona) REFERENCES persona(id) ON DELETE CASCADE
    );

-- 6. Usuarios Administradores (Relación 1 a 1 con Persona)
CREATE TABLE IF NOT EXISTS usuario (
                                       id BIGSERIAL PRIMARY KEY,
                                       username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'ROLE_ADMIN',
    id_persona BIGINT NOT NULL UNIQUE,
    CONSTRAINT fk_usuario_persona FOREIGN KEY (id_persona) REFERENCES persona(id) ON DELETE CASCADE
    );