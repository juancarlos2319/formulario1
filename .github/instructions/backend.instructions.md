---
name: backend-reglas
description: "Reglas para cambios en la API Java/Spring del backend."
applyTo: "Backend/**/*.java,Backend/**/*.properties,Backend/**/*.sql"
---

- Lee `Backend/demo/AGENTS.md` y `docs/back/BACKEND_ESPECIFICACION_AGENTES.md`; consulta `README.md` para el contrato detallado.
- Mantén capas, validación en servicio, transacciones e integridad referencial existentes. Usa DTOs para entrada/salida HTTP.
- Protege secretos y datos personales: no los incluyas en respuestas, registros, ejemplos o pruebas.
- Para cambios de esquema, revisa `schema.sql`, `data.sql`, entidades JPA y restricciones existentes; no asumas que Hibernate ejecuta los scripts SQL.
- Actualiza documentación y pruebas del contrato. Ejecuta pruebas únicamente con base de integración desechable configurada.
