# Revisión técnica y limitaciones conocidas

Revisión base del 15 de octubre de 2026 sobre el código versionado entonces. Los hallazgos proceden de lectura estática, no de explotación, medición de carga ni inspección de una base instalada. La migración posterior actualizó Angular, el builder, el runner de pruebas y las animaciones del frontend; este informe conserva sus resultados y hallazgos con la fecha original, sin certificar el estado de producción.

## Resultados comprobados en la revisión base (2026-10-15)

- `npm.cmd run build`: aprobado; conserva warnings de presupuesto inicial/CSS.
- Frontend en revisión base: Angular/Karma/ChromeHeadless, 94 pruebas aprobadas. Este runner fue sustituido por Vitest durante la migración del 2026-10-28; no tomar este número como verificación actual.
- Maven: 43 unitarias seleccionadas, ejecutadas y aprobadas; 13 integraciones excluidas expresamente.
- Login: verificación visual previa con tema Material activo, controles de 56 px y botón de 49 px. No hay auditoría visual completa.
- No se usó ni vació la base de desarrollo para esta revisión.

## Hallazgos

| ID | Prioridad de revisión | Evidencia | Implicación |
| --- | --- | --- | --- |
| R01 | Resuelta (2026-10-29) | `CuentaService.actualizarLogin`, `CuentaComponent`, `Usuario` y `schema.sql` | Límite de 50 alineado en servicio, JPA, formulario y SQL; los valores largos se rechazan con 400 antes de persistir |
| R02 | Alta | `SecurityConfig`, `JwtFilter`, `AuthController` | Seguridad exige autenticación, no rol/pertenencia; JWT crea autoridades vacías, no reconsulta cuenta/baja. No hay autorización por titular ni revocación server-side |
| R03 | Alta | `data.sql` y creación implícita de ocupaciones | Solo se reajusta `persona_id_seq`; catálogos/cuentas con IDs explícitos conservan secuencias potencialmente atrasadas |
| R04 | Alta | `application.properties` | Valores de conexión y clave JWT literales en una fuente versionada. Se omitieron en los documentos; externalización/rotación debe tratarse separadamente |
| R05 | Media | `PersonaService.reactivar` frente a `bloquearContactos` | Altas usan advisory lock global; reactivaciones no. Altas/reactivaciones concurrentes pueden superar el límite lógico de 20; SQL no lo garantiza |
| R06 | Media | `PersonaService.validarTitular`, entidades y SQL | Género del titular no se valida explícitamente y los contactos no tienen control de longitud 50. Fechas futuras no se rechazan; validaciones de la UI no equivalen a seguridad del servidor |
| R07 | Media | `PersonaController` | PUT/DELETE traducen RuntimeException a 404; POST a 400; otros endpoints delegan en Spring. No hay contrato homogéneo de errores ni distinción estable entre fallos internos/cliente |
| R08 | Media | `PersonasService.consultarPersonasCache`, `consultarCompartido`, `obtenerContactos` | Eliminar entrada no cancela peticiones antiguas. Algunos finalizers/error handlers borran por URL/ID sin comprobar identidad; pueden afectar una petición nueva tras invalidación. No es persistencia de sesión en disco |
| R09 | Media | `OcupacionController` y `PersonasService.obtenerOcupaciones` | API devuelve objetos `{id,nombre}`, pero servicio TypeScript declara `string[]`; Registro usa `any[]` y fallback `o.nombre || o`, ocultando el desacuerdo |
| R10 | Media | `data.sql`, `direccion_titular` | Reejecutar semilla puede duplicar direcciones. No hay UNIQUE persona/orden; la coherencia del orden depende del servicio |
| R11 | Media | Métodos JPA de listado y `convertirAResumen` | Se reduce JSON, pero se recuperan entidades y asociaciones para construirlo. No se midió N+1 ni EXPLAIN; no debe afirmarse que el listado ejecuta solo una proyección SQL reducida |
| R12 | Media | `AuthController.login`, `JwtFilter` | Login distingue 404/401 y no valida body completo; filtro acepta identidad de firma válida sin comprobar que usuario siga existiendo. Cambio de username no revoca token criptográficamente |
| R13 | Media | Logs de PersonasService y ContactosComponent | Se registra el objeto de error HTTP/stack completo. Puede incluir body o detalles internos; no hay sanitización de logs demostrada |
| R14 | Baja | `PersonaTelefono`, `schema.sql`, `ddl-auto=update` | Longitud JPA 30 y SQL 10; DDL Hibernate y SQL manual pueden producir esquemas distintos |
| R15 | Baja | `schema.sql` ALTER de usuario | ADD COLUMN NOT NULL no rellena una tabla antigua; no constituye migración válida de datos existentes |
| R16 | Operativa | `jwtInterceptor` y cachés | Salida por backend caído se dispara en la siguiente petición. No hay health polling; pérdida de red/CORS también puede producir estado 0 y cerrar sesión |
| R17 | Operativa | `PersonaResumenDTO` | Solo municipio principal en listado. La búsqueda usa los datos disponibles; no busca municipios de direcciones secundarias no descargadas |
| R18 | Operativa | `AuthService` y almacenamiento | JWT en localStorage, borrador en sessionStorage; no refresh token. Validar `exp` en cliente no valida firma. El intervalo de 250 ms observa almacenamiento, no backend |

Las prioridades indican impacto potencial para futuras tareas; no son una certificación de vulnerabilidad ni una autorización para cambiar reglas funcionales en esta entrega.

## Diferencias entre requisitos de captura y backend

| Concepto | UI | Servicio Java/SQL |
| --- | --- | --- |
| Nombres titular | Mínimo 2 en controles | Servicio exige no blank y máximo 100; controles no imponen el mismo máximo |
| Dirección | País/estado/municipio/colonia/CP/calle/número obligatorios | Servicio admite vacíos excepto calle/municipio; CP vacío permitido por SQL |
| Aceptación de términos | Obligatoria en alta; deshabilitada en edición | No se envía ni persiste en PersonaDTO |
| Ocupaciones | Select con catálogo | Servicio crea ocupación desconocida; parentesco debe existir |
| Contraseña nueva | Cuenta: mínimo 8, máximo 72 bytes | Utilidad administrativa de hash: mínimo 12 y coste BCrypt 12 |
| Relaciones de contacto | Confirmación y mínimo 1 | Servicio valida mínimo; SQL permite cero y no exige perfil en origen |

## Cobertura y tareas pendientes de validación

La suite usa mocks y pruebas HTTP simuladas; las pruebas de integración no se ejecutaron. Quedan sin comprobación empírica: serialización real de errores de Spring Security, URLs fuera de localhost, CORS del proveedor postal, persistencia y rollback con PostgreSQL, concurrencia de reactivaciones, planes de consulta, flujo completo en navegador con backend real y revisión de accesibilidad.

La actualización selectiva del listado se verificó con respuestas HTTP simuladas: reemplazo por ID, conservación de otras filas/detalles, ediciones sucesivas, petición inicial tardía y escritura de una sesión anterior. El encabezado se comprobó con cambios propios/ajenos, campos no visibles, contacto compartido, guardado fallido y perfil antiguo pendiente.

Los números de pruebas se documentan con fecha y no deben copiarse indefinidamente. Los manifiestos de la guía tienen hashes/line numbers para identificar la revisión exacta; después de cambiar fuentes, regenerarlos.
