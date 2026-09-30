# Guía de agentes del repositorio

Este repositorio contiene dos aplicaciones independientes:

- **Frontend:** `Proyecto-FullStackfrontend/` — Angular y TypeScript.
- **Backend:** `Proyecto-FullStackbackend/demo/` — Java, Spring Boot, JPA y PostgreSQL.

## Uso del contexto

1. Antes de cambiar código, lee el `AGENTS.md` del proyecto afectado y su especificación `docs/ESPECIFICACION_AGENTES.md`.
2. Si la tarea corresponde a un flujo de trabajo, carga la skill pertinente en `.github/skills/frontend/` o `.github/skills/backend/`.
3. Para contratos API y reglas funcionales detalladas del servidor, la referencia existente es `Proyecto-FullStackbackend/demo/README.md`; actualízala si cambia el contrato.
4. Si una instrucción contradice el código o la configuración actuales, verifica los archivos fuente y explica la discrepancia; no inventes convenciones.
5. En cambios que toquen ambos proyectos, verifica que DTOs, rutas, nombres de campos, validaciones y autenticación sigan alineados.

Las reglas específicas por archivos están en `.github/instructions/` y se aplican por `applyTo`.