# Frontend Angular de administración de personas

SPA standalone con Angular/Material 18.2.14, TypeScript 5.5.4 y RxJS 7.8.2. [Arquitectura](../docs/ARQUITECTURA.md), [API](../docs/API.md), [persistencia](../docs/BASE_DE_DATOS.md), [operación/pruebas](../docs/OPERACION_Y_PRUEBAS.md) y [revisión](../docs/REVISION_TECNICA.md) son la documentación compartida.

## Ejecución

Desde esta carpeta:

```powershell
npm.cmd ci
npm.cmd start
npm.cmd run build
npm.cmd test -- --watch=false --browsers=ChromeHeadless
```

Servidor: http://localhost:4200; backend esperado: http://localhost:8080. En otras shells usar npm sin .cmd. Build production genera dist/formulario-registro/browser; watch usa development. No hay environment central de URLs, SSR, Service Worker, Docker ni E2E versionado.

## Entradas y organización

| Archivo/carpeta | Responsabilidad |
| --- | --- |
| src/main.ts | Bootstrap standalone |
| src/app/app.config.ts | Router, provideAnimations y HttpClient/interceptor |
| src/app/app.routes.ts | Rutas, guards, títulos y modos de contactos |
| src/app/app.component.ts | Redirección global ante pérdida de token |
| components/ | Pantallas, layout y feedback |
| services/ | Transporte HTTP, sesión, cachés y borrador |
| interfaces/ | Contratos TypeScript; no validación JSON en runtime |
| guards/ | Autenticado/invitado |
| interceptors/ | Bearer, timeout y fallos de la API |
| src/styles.scss | Variables y reglas globales; @use del tema Material |
| src/material-typography.scss | Material 3 Azure/Blue y familias tipográficas |

Login usa ngModel; registro/contactos/cuenta, formularios reactivos. Señales gestionan datos visibles, carga, selección y errores; RxJS gestiona solicitudes y coincidencias. No hay Store NgRx ni un patrón único de teardown en todas las suscripciones.

## Rutas

| Ruta | Componente | Comportamiento |
| --- | --- | --- |
| / | Redirect | /inicio |
| /inicio | InicioComponent + guestGuard | Login; sesión válida va a dashboard |
| /dashboard | DashboardComponent | Agregado, capacidad y top 5 ocupaciones |
| /personas | PersonasComponent | Resumen, búsqueda local, detalles y baja |
| /personas/desactivadas | PersonasDesactivadasComponent | Búsqueda local y reactivación |
| /registro | RegistroComponent | Alta, primer paso; borrador, sin POST |
| /registro/:id | RegistroComponent | Editar titular activo por ID |
| /contactos | ContactosComponent | Segundo paso de alta; exige borrador |
| /contactos/:id | ContactosListaComponent | Relaciones; quitar manteniendo mínimo uno |
| /contactos/:id/editar/:contactoId | ContactosComponent | Editar relación/persona compartida |
| /contactos/:id/agregar | ContactosComponent | Agregar conservando relaciones previas |
| /cuenta | CuentaComponent | Credenciales; logout al guardar |
| Otras | Redirect | /inicio |

Administrativas dentro de AdminLayout, con canActivate y canActivateChild. El guard valida expiración local, no firma; el backend es autoridad final. No hay returnUrl. Sidebar calcula subapartados por URL de edición/persona/contacto; breakpoint del menú 760 px.

## Contratos y formularios

PersonaResumen usa `direcciones?:Pick<Direccion,'municipio'>[]`; el backend devuelve solo municipio principal. PersonaDetalle contiene género, fecha y direcciones completas. Usuario representa el formulario y usa Direccion[]. Detalles usa /{id}/detalles; editar usa /{id}. Contactos se descargan por ruta separada. No existen campos JSON direccion/ciudad.

La búsqueda local normaliza NFD, elimina diacríticos y usa datos descargados; no consulta SQL ni municipios secundarios. Cerrar/reabrir detalles o navegar conserva datos en PersonasService.

Registro usa FormArray para direcciones/correos/teléfonos y mantiene mínimo uno. cp se convierte a codigoPostal; nombres/apellidos separados a nombre/apellido. El alta guarda registro_borrador en memoria/sessionStorage y navega a contactos; solo el segundo paso ejecuta POST transaccional. Edición bloqueada hasta cargar persona. Las direcciones se conservan sin consultar CP al abrir; se permite captura manual y se ignoran respuestas postales obsoletas o de grupos eliminados.

Contactos usa comunicaciones variables, debounceTime(350), switchMap y revisiones. Reutilización confirmada bloquea datos personales y envía ID/parentesco. Edición completa de persona compartida exige confirmación. Guardado conserva IDs no editados; quitar sustituye el conjunto completo, no llama DELETE de persona. Nunca se guarda antes de cargar/verificar.

Cuenta valida username, contraseña actual, nueva y confirmación, con máximo de 72 bytes UTF-8. Tras ok:true limpia formulario, cierra sesión y vuelve al login. El máximo 255 de username difiere del SQL 50; ver revisión R01.

## Servicios, cachés y errores

| Servicio | Responsabilidad |
| --- | --- |
| PersonasService | Personas/contactos/catálogos; Maps de datos y pendientes; borrador; Subject de actualización del perfil |
| AuthService | JWT localStorage, BehaviorSubject, perfil en señal, expiración y cambios externos |
| CodigoPostalService | GET https://www.correosmexico.com.mx/api/cp con parámetro cp; sin JWT |
| FeedbackService | Avisos de 5 s, confirmación Promise y señales |

JWT: jwt_token/localStorage. Borrador: registro_borrador/sessionStorage. Header usa datos del login o /auth/me al recargar; actualización selectiva por idPersona cuando cambia nombre completo o correo principal, sin polling de perfil. La fila del PUT permite actualizar la cuenta propia localmente; contactos compartidos solo disparan /auth/me si afectan esos campos de la cuenta activa.

Listas activas/inactivas y detalles: memoria sin TTL. Contactos: 30 s desde crear entrada. Parentescos: sesión. Formulario por ID/ocupaciones/resumen: solo compartir pendientes. Editar un titular conserva el listado y reemplaza solo su ID con el resumen del PUT, sin otro GET. Invalida únicamente los detalles de ese ID; altas/bajas/reactivaciones/contactos y sesión mantienen invalidación completa. Contactos se invalidan tras edición de personas/contactos/sesión. [Matriz y límites](../docs/ARQUITECTURA.md).

jwtInterceptor afecta solo http://localhost:8080/api/. Añade Bearer, timeout por emisión 15 s, logout para 401/0/5xx si coincide token capturado. No logout por 403/validación/CP externo. Detecta caída al pedir datos, no periódicamente. PersonasService convierte HttpErrorResponse a Error con mensaje; no siempre se conserva status original en consumidores.

## Tema y presentación

Sora: títulos; Plus Jakarta Sans: controles/lectura; IBM Plex Mono: estadísticas/campos numéricos. Familias centralizadas en --app-font-body, --app-font-heading, --app-font-numeric. Google Fonts en index.html con display=swap, preconnect y fallbacks.

El tema incluye core, botones/icon-buttons/FAB, card, checkbox, form-field/input, list, progress-bar/spinner, select, sidenav, table y toolbar. Añadir módulos Material puede requerir extender sus mixins. No reemplazar base/color/densidad por solo tipografía. Entrada Sass tanto en build como Karma; reiniciar ng serve tras cambios de angular.json.

Feedback usa dialog nativo/showModal, no MatDialog. Login/dashboard tienen animaciones y reduced-motion. Las listas incluyen tarjetas móviles, estados de carga y atributos ARIA. No hay auditoría completa de accesibilidad ni visual automatizada.

## Verificación

2026-10-15: build aprobado y 94 pruebas Angular aprobadas, con warnings de tamaño. Verificación visual previa del login en Chrome. No E2E ni pruebas de todos los componentes conectados a backend real.

Antes de modificar HTTP contrastar DTO Java/TypeScript. La respuesta de ocupaciones es objeto id/nombre aunque el servicio declara string[] y Registro usa any[]; no asumir que los generics equivalen a contrato runtime. Actualizar documentación compartida al cambiar modelo/rutas.

Las funciones de componentes, servicios, guards e interceptor incluyen comentarios breves de propósito y lógica. Se documentan también getters, helpers locales y estado derivado relevante; no se añaden comentarios repetitivos a cada callback HTTP o prueba. Los comentarios no cambian contratos ni comportamiento.

Edicion del formulario: PATCH /api/personas/{id} intercambia solo campos modificados y sus valores persistidos. Frontend compara con una copia en memoria, omite peticiones sin cambios y fusiona deltas de lista/detalles sin GET posterior. Colecciones modificadas se envian completas; PUT completo permanece compatible.
