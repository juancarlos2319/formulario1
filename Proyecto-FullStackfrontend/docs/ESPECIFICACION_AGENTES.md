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
- `services/`: `PersonasService` consume formularios, contactos y catálogos; `AuthService` gestiona el inicio/cierre de sesión y vigencia JWT.
- `interfaces/`: contratos TypeScript; `guards/` y `interceptors/`: control de navegación y solicitudes.
- `app.config.ts` registra Router y HttpClient con `jwtInterceptor`.

## Contratos y comportamiento

- Prefijos actuales: `/api/auth/login`, `/api/personas`, `/api/ocupaciones`, `/api/parentescos`.
- `/contactos/:id` lista los datos de contacto; editar un vínculo abre `/contactos/:id/editar/:contactoId` y agregar uno usa `/contactos/:id/agregar`.
- Las rutas protegidas requieren `Authorization: Bearer <token>`; el login devuelve un objeto con `token` y `username`.
- Los contactos de emergencia pueden ser varios; al editar se conserva `idContacto`. Enviar solo el ID y el parentesco cambia el vínculo; enviar también todos los datos personales modifica la persona compartida y afecta a los demás titulares relacionados.
- `PersonasService` mantiene un borrador del registro en memoria y `sessionStorage`; no persistir esos datos más allá del flujo previsto.
- El formulario conserva las direcciones guardadas sin consultar el código postal al abrir una edición. País, estado, municipio y colonia permiten captura manual si la consulta de CP falla; el payload usa `direcciones[].codigoPostal`, convertido desde el control `cp`. Los errores de guardado muestran el mensaje devuelto por el servicio.
- Al crear y editar contactos de emergencia se pueden agregar y quitar correos y teléfonos, manteniendo al menos uno de cada tipo. Cada campo se valida y las listas rechazan repetidos; las búsquedas de coincidencias incluyen todas las comunicaciones. Los contactos reutilizados mantienen sus datos bloqueados y se envían solo por ID y parentesco.
- URLs, campos, validaciones y detalles completos están definidos en `Proyecto-FullStackbackend/demo/README.md`; esa documentación es la fuente compartida del contrato vigente.

## Reglas de cambios

- Mantén tipos de interfaces sincronizados con DTOs/respuestas del backend.
- Evita duplicar URLs base o adjuntar tokens manualmente si el interceptor/patrón del servicio ya lo resuelve; primero verifica el flujo concreto actual.
- No expongas JWT ni datos personales en logs, errores o ejemplos. No registres secretos en el repositorio.
- Actualiza pruebas y documentación visible cuando cambie navegación, formulario o contrato.
- Buscar coincidencias por correo/teléfono en tiempo real y pedir confirmación antes de reutilizar `idContacto`. Rechazar vacía el campo; aceptar envía solo ID y parentesco. Después de editar/agregar a un titular existente, volver a `/contactos/:id`. Quitar la última referencia elimina el contacto sin perfil/cuenta en backend.
