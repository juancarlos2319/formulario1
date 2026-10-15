# Contexto técnico frontend

Fuentes: [README](../README.md), [arquitectura](../../docs/ARQUITECTURA.md), [API](../../docs/API.md), [operación](../../docs/OPERACION_Y_PRUEBAS.md) y [revisión](../../docs/REVISION_TECNICA.md).

## Stack y ejecución

Angular/Material 18.2.14, TypeScript 5.5.4, RxJS 7.8.2; standalone. npm.cmd start/build/test (scripts de package.json). Estilos globales en src/styles.scss con @use Material; Sass debe funcionar en build y Karma. API local http://localhost:8080/api/, URLs en servicios/interceptor, CP externo.

## Invariantes

- Listas resumidas y municipio principal; detalles /{id}/detalles; editar /{id} completo. No reintroducir direccion/ciudad ni descargar contactos en el formulario.
- PersonaResumen tiene dirección parcial; Usuario completa. Comunicaciones variables, mínimo una de cada tipo; direcciones entre 1 y 20 en backend; contactos mínimo uno sin máximo.
- Alta en dos pasos: borrador memoria/sessionStorage y POST final transaccional con contactos. Edición titular no sustituye contactos.
- Convertir cp a codigoPostal y nombres separados a nombre/apellido. Conservar direcciones al abrir y permitir captura manual postal.
- Contactos reutilizados: confirmar, bloquear personales, enviar ID/parentesco. Editar compartidos completos afecta otros titulares. PUT reemplaza lista; conservar demás IDs.
- Guards validan expiración local, no firma. guestGuard dirige autenticados a dashboard. Preservar navegación contextual y bloqueos/carga.

## Estado y errores

- JWT localStorage; borrador sessionStorage. Logout limpia borrador/perfil/cachés.
- Header desde login o /auth/me; refresh tras edición exitosa de personas/contactos, sin polling HTTP.
- Listas/detalles sin TTL; invalidar tras escrituras/sesión. Contactos 30 s; parentescos por sesión; formulario/resumen/ocupaciones solo pendientes.
- API local: timeout 15 s y logout ante 401/0/5xx con mismo token capturado. No logout por 403/validación/CP externo. Detección de caída al pedir, no periódica.
- No persistir cachés personales en almacenamiento del navegador.

## UI y verificación

Tema Material completo para módulos utilizados: core/base/color/densidad/tipografía; extender al agregar otro módulo. Sora títulos, Plus Jakarta Sans lectura, IBM Plex Mono cifras; variables --app-font-*. Mantener reduced-motion, feedback, ARIA y vistas móviles.

Revisión 2026-10-15: build y 86 pruebas aprobadas. No E2E/integración HTTP real. Consultar hallazgos antes de afirmar igualdad de validaciones/tipos/cachés. Sincronizar DTOs, interfaz y documentación al modificar contratos.
