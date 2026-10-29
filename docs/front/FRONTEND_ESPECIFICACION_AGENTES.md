# Contexto técnico frontend

Fuentes: [README frontend](../../Frontend/README.md), [arquitectura](../ARQUITECTURA.md), [API](../API.md), [operación](../OPERACION_Y_PRUEBAS.md) y [revisión](../REVISION_TECNICA.md).

## Stack y ejecución

Angular/Material/CDK 22.x, TypeScript 6.x, RxJS 7.8.x; standalone. npm.cmd start/build/test (scripts de package.json). Build con @angular/build; pruebas Vitest/jsdom mediante el builder unit-test. Estilos globales en src/styles.scss con Sass y @use Material. API local http://localhost:8080/api/, URLs en servicios/interceptor, CP externo.

## Invariantes

- Listas resumidas y municipio principal; detalles /{id}/detalles; editar /{id} completo. No reintroducir direccion/ciudad ni descargar contactos en el formulario.
- PersonaResumen tiene dirección parcial; Usuario completa. Comunicaciones variables, mínimo una de cada tipo; direcciones entre 1 y 20 en backend; contactos mínimo uno sin máximo.
- Alta en dos pasos: borrador memoria/sessionStorage y POST final transaccional con contactos. Edición titular no sustituye contactos.
- Convertir cp a codigoPostal y nombres separados a nombre/apellido. Conservar direcciones al abrir y permitir captura manual postal.
- Contactos reutilizados: confirmar, bloquear personales, enviar ID/parentesco. Editar compartidos completos afecta otros titulares. PUT reemplaza lista; conservar demás IDs.
- Guards validan expiración local, no firma. guestGuard dirige autenticados a dashboard. Preservar navegación contextual y bloqueos/carga.

## Estado y errores

- JWT localStorage; borrador sessionStorage. Logout limpia borrador/perfil/cachés.
- Header desde login o /auth/me con idPersona. Actualizarlo solo si cambia nombre completo/correo principal de esa persona; usar los campos persistidos del PATCH sin GET adicional. En contactos compartidos consultar /auth/me solo si esos campos afectan a la cuenta activa.
- Listas/detalles sin TTL; al editar un titular reemplazar su fila por ID sin descargar toda la lista y fusionar sus detalles modificados. Otras escrituras/sesión conservan invalidación completa. Contactos 30 s; parentescos por sesión; formulario/resumen/ocupaciones solo pendientes.
- API local: timeout 15 s y logout ante 401/0/5xx con mismo token capturado. No logout por 403/validación/CP externo. Detección de caída al pedir, no periódica.
- No persistir cachés personales en almacenamiento del navegador.

## UI y verificación

Tema Material completo para módulos utilizados: core/base/color/densidad/tipografía; extender al agregar otro módulo. Sora títulos, Plus Jakarta Sans lectura, IBM Plex Mono cifras; variables --app-font-*. Mantener reduced-motion, feedback, ARIA y vistas móviles.

Migración 2026-10-28: se registraron build aprobado y 92 pruebas Vitest aprobadas; resultado histórico, no repetido tras los cambios visuales posteriores. No E2E/integración HTTP real. Consultar hallazgos antes de afirmar igualdad de validaciones/tipos/cachés. Sincronizar DTOs, interfaz y documentación al modificar contratos.

Edición del titular: PATCH /api/personas/{id} intercambia solo campos modificados y sus valores persistidos. El servicio compara con una copia en memoria, omite peticiones sin cambios y fusiona cambios de lista/detalles sin GET posterior. Las colecciones modificadas se envían completas; PUT completo permanece disponible por compatibilidad.
