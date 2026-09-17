-- Ejecutar una vez en la base existente antes de guardar dos contactos.
-- Conserva los contactos actuales y elimina únicamente la restricción 1 a 1.
DO $$
DECLARE restriccion record;
BEGIN
  FOR restriccion IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attname = 'id_persona'
    WHERE c.conrelid = 'contacto_emergencia'::regclass
      AND c.contype = 'u' AND c.conkey = ARRAY[a.attnum]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE contacto_emergencia DROP CONSTRAINT %I', restriccion.conname);
  END LOOP;
END $$;
