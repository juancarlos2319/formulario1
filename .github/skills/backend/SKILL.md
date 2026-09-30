---
name: backend
description: "Usa cuando se implementen, depuren o revisen controladores, servicios, entidades, repositorios, seguridad o pruebas Spring del backend."
---

# Flujo de trabajo backend

1. Lee `Proyecto-FullStackbackend/demo/AGENTS.md`, `docs/ESPECIFICACION_AGENTES.md` y la sección aplicable de `README.md`.
2. Traza endpoint → controller → service → repository/entity/DTO y revisa pruebas relacionadas antes de editar.
3. Preserva contratos HTTP, validación, transacciones y las invariantes de relaciones compartidas. Considera rollback e idempotencia en operaciones de escritura.
4. Para cambios de persistencia, coteja entidades, restricciones y `src/main/resources/schema.sql`/`data.sql`; describe cualquier migración manual necesaria.
5. No ejecutes pruebas de integración contra `nomina_db` ni otra base de desarrollo: solo usa una base desechable aislada. Ejecuta `mvnw.cmd test` desde `demo/` cuando sea seguro.
6. Si cambia un endpoint o campo, actualiza README/especificación y avisa que el frontend puede requerir cambios. Reporta exactamente las pruebas ejecutadas.