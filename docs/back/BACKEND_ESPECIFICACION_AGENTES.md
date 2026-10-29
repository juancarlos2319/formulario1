# Contexto técnico backend

Fuentes: [README backend](../../Backend/demo/README.md), [API](../API.md), [BD](../BASE_DE_DATOS.md), [arquitectura](../ARQUITECTURA.md), [operación](../OPERACION_Y_PRUEBAS.md), [revisión](../REVISION_TECNICA.md).

## Stack/capas

Java 21, Spring Boot 4.1.1, MVC/Security/JPA/JDBC, JJWT 0.11.5 y PostgreSQL. Wrapper Maven 3.9.16. Controller → servicio transaccional → repositorio; DTOs de personas, entidades de catálogos. Configuración con valores literales sensibles: no copiarlos.

## Modelo y contratos

- Titular por PerfilTitular/PK compartida; no es_titular. Activo con fecha_baja null.
- Direcciones exclusivamente direccion_titular, orden principal cero; perfil/DTO sin direccion/ciudad. Esquema/semilla de base nueva, sin migraciones activas.
- Comunicaciones variables, mínimo una de cada tipo; contactos mínimo uno sin máximo; direcciones entre 1 y 20.
- Parentesco del vínculo, persona compartida. No REMOVE desde vínculo hacia contacto.
- Omitidos en sustitución se desvinculan; cleanup solo sin perfil/cuenta/vínculos entrantes o salientes.
- ADMIN vinculado no se da de baja; reactivar solo dado de baja con capacidad disponible.
- Listado PersonaResumenDTO, adicionales PersonaDetalleDTO, editar PersonaDTO sin contactos rellenados. PUT titular devuelve PersonaActualizadaDTO con su fila de listado; otras escrituras ResultadoDTO; DELETE 204. UsuarioActualDTO incluye idPersona.
- POST crea con contactos; PUT titular no sustituye contactos; PUT contactos sustituye conjunto entero.
- El servicio crea ocupación desconocida; parentesco debe existir. No documentar la regla contraria.
- Advisory lock en alta/sustitución contactos, no reactivación; límite no garantizado en toda concurrencia.
- Filtro verifica JWT, no roles/existencia/baja/pertenencia. Solo login/OPTIONS públicos.
- No formato uniforme de errores/ControllerAdvice. Consultar discrepancias UI/servicio/SQL al cambiar validación.

## Pruebas/documentación

mvnw.cmd test desde demo. Integración requiere TEST_DATABASE_URL local /nomina_backend_test; usa TRUNCATE CASCADE. Nunca desarrollo. Revisión 2026-10-15: 43 unitarias aprobadas y 13 integraciones excluidas expresamente de la ejecución.

Actualizar API/BD/READMEs al cambiar modelo/rutas. PDF/manifiesto con generador que calcula referencias, no reescribe README ni reproduce secretos o datos personales. Regenerar tras cambios; no conservar referencias a archivos eliminados. El frontend usa Angular 22 y Vitest; consulta el README frontend y el informe de migración en razi.

Edicion del formulario: PATCH /api/personas/{id} intercambia solo campos modificados y sus valores persistidos. Frontend compara con una copia en memoria, omite peticiones sin cambios y fusiona deltas de lista/detalles sin GET posterior. Colecciones modificadas se envian completas; PUT completo permanece compatible.
