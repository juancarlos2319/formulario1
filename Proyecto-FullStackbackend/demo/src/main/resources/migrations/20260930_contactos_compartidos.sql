-- Ejecutar una vez sobre la base existente. No elimina ni fusiona datos previos.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_persona_correo_busqueda
    ON persona_correo (lower(trim(correo)));
CREATE INDEX IF NOT EXISTS idx_persona_telefono_busqueda
    ON persona_telefono (telefono);
CREATE INDEX IF NOT EXISTS idx_pce_contacto
    ON persona_contacto_emergencia (id_contacto);
COMMIT;
