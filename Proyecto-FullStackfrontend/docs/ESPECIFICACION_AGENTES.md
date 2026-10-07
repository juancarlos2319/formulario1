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
- `app.config.ts` registra `provideAnimations()` para preparar el motor antes de renderizar la entrada del login y los componentes Material; las pruebas de interacción pueden usar `provideNoopAnimations()`.

## Contratos y comportamiento

- La integración de formularios Material conserva `provideAnimations()` para la entrada del login. La caché de contactos de 30 segundos se invalida al guardar personas/contactos compartidos; contactos y parentescos se limpian al cambiar de sesión.

- El layout administrativo usa `mat-sidenav` con navegación `mat-nav-list` y un header `mat-toolbar`. En escritorio el menú permanece abierto; hasta 760 px se abre mediante un botón, superpuesto con fondo y cierre al navegar. Conserva la señal de la cuenta activa y el subapartado de edición.

- Al navegar a `/registro/:id`, el menú muestra el subapartado activo «Editar persona» debajo de Personas, vinculado al ID actual. Registro solo se marca activo en `/registro` (alta); el subapartado desaparece al salir de la edición.

- El dashboard usa tarjetas `mat-card`, acciones `mat-button`/`mat-flat-button`/`mat-stroked-button`, navegación rápida con `mat-nav-list` y barras `mat-progress-bar` para carga y distribución por ocupación. Conserva las señales y el resumen del backend, las acciones de reintento y el límite de 20 titulares.

- El login utiliza Angular Material: `mat-form-field` con `matInput` para credenciales y errores, botón de contraseña con `matSuffix`, botón de envío `mat-flat-button` y `mat-spinner` durante la petición. Conserva `ngModel`, `AuthService` y el control de autocompletado al recibir foco.
- El login anima cada elemento con `@angular/animations` al abrir o recargar, con retrasos separados por 120 ms. Si el navegador indica `prefers-reduced-motion: reduce`, conserva la secuencia con apariciones de 250 ms sin desplazamiento; en modo normal combina opacidad y desplazamiento.

- El login inicia vacío con `autocomplete="off"` y campos de solo lectura hasta recibir foco (clic o teclado). Al enfocar cada campo habilita escritura y sugerencias de usuario o contraseña. El navegador o gestor de contraseñas puede ignorar estas indicaciones; no se borran valores elegidos por el usuario.

- Prefijos actuales: `/api/auth/login`, `/api/personas`, `/api/ocupaciones`, `/api/parentescos`.
- `/contactos/:id` lista los datos de contacto; editar un vínculo abre `/contactos/:id/editar/:contactoId` y agregar uno usa `/contactos/:id/agregar`.
- Las rutas protegidas requieren `Authorization: Bearer <token>`; el login devuelve un objeto con `token` y `username`.
- El login también devuelve `usuarioActual` con nombre y correo del backend. `AuthService` conserva esos datos en memoria y el header lee su señal durante la navegación; cerrar, cambiar o expirar la sesión borra los datos. Una recarga recupera la cuenta una sola vez mediante `/api/auth/me`.
- Un guardado exitoso de datos de personas o contactos dispara una consulta de `/api/auth/me` para actualizar el header, incluyendo cuentas compartidas como contactos. Un guardado fallido no dispara la consulta; una respuesta anterior o de una sesión cerrada no reemplaza datos vigentes. No hay consultas periódicas de perfil.
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
