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

INSERT INTO direccion_titular
    (id_persona, orden, pais, estado, municipio, colonia, codigo_postal, calle, numero)
SELECT p.id_persona, 0, 'México', '', p.ciudad, '', '', p.direccion, ''
FROM perfil_titular p
WHERE NOT EXISTS (
    SELECT 1 FROM direccion_titular d
    WHERE d.id_persona = p.id_persona AND d.orden = 0
);