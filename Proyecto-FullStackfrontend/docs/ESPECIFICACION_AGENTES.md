- `src/app/app.routes.ts`: la pantalla `personas/desactivadas` permite consultar y reactivar titulares con baja lógica; accede desde `PersonasComponent`.
# Especificación de contexto — Frontend

## Stack y ejecución

- Angular 18.2, TypeScript 5.5, RxJS 7 y componentes standalone.
- `npm start`: servidor local en `http://localhost:4200/`.
- `npm run build`: compilación de producción; `npm test`: pruebas Angular/Karma.
- Backend local esperado en `http://localhost:8080`.

## Arquitectura

- `src/app/app.routes.ts`: rutas. `InicioComponent` usa `guestGuard`; el layout administrativo y sus páginas requieren `authGuard`.
- La ruta `personas/desactivadas` muestra titulares dados de baja y permite reactivarlos; el enlace se ofrece desde la pantalla de personas.
- `components/`: pantallas de inicio, dashboard, personas, registro, contactos y componentes compartidos.
- `services/`: `RegistroService` consume formularios, contactos y catálogos; `AuthService` gestiona el inicio/cierre de sesión y vigencia JWT.
- `interfaces/`: contratos TypeScript; `guards/` y `interceptors/`: control de navegación y solicitudes.
- `app.config.ts` registra Router y HttpClient con `jwtInterceptor`.

## Contratos y comportamiento

- Prefijos actuales: `/api/auth/login`, `/api/formularios`, `/api/ocupaciones`, `/api/parentescos`.
- Las rutas protegidas requieren `Authorization: Bearer <token>`; el login devuelve un objeto con `token` y `username`.
- Los contactos de emergencia pueden ser varios; al editar una relación se debe conservar `idContacto` y enviar `idParentesco`. La API distingue una persona/contacto de la relación persona-parentesco y no modifica datos personales de una persona compartida.
- `RegistroService` mantiene un borrador del registro en memoria y `sessionStorage`; no persistir esos datos más allá del flujo previsto.
- URLs, campos, validaciones y detalles completos están definidos en `Proyecto-FullStackbackend/demo/README.md`; esa documentación es la fuente compartida del contrato vigente.

## Reglas de cambios

- Mantén tipos de interfaces sincronizados con DTOs/respuestas del backend.
- Evita duplicar URLs base o adjuntar tokens manualmente si el interceptor/patrón del servicio ya lo resuelve; primero verifica el flujo concreto actual.
- No expongas JWT ni datos personales en logs, errores o ejemplos. No registres secretos en el repositorio.
- Actualiza pruebas y documentación visible cuando cambie navegación, formulario o contrato.