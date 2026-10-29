# Backend de administración de personas

Java 21, Spring Boot 4.1.1, MVC, Security, Data JPA/JDBC, PostgreSQL y JJWT 0.11.5. Documentación completa: [arquitectura](../../docs/ARQUITECTURA.md), [API](../../docs/API.md), [BD](../../docs/BASE_DE_DATOS.md), [operación](../../docs/OPERACION_Y_PRUEBAS.md), [hallazgos](../../docs/REVISION_TECNICA.md).

## Ejecución

```powershell
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
```

Wrapper Maven 3.9.16, puerto esperado 8080, CORS http://localhost:4200. El POM fija Java 21 y contiene plugin Asciidoctor en prepare-package; no hay OpenAPI/REST Docs efectivo que sustituya los contratos Markdown. En Linux/macOS usar ./mvnw.

Configuración: src/main/resources/application.properties. Datasource/clave JWT contienen valores literales sensibles; se omiten aquí/PDF. ddl-auto=update, show-sql=true, dialecto PostgreSQL. No asumir consumo automático de DATABASE_URL/JWT_SECRET sin vincularlo mediante propiedades/overrides Spring. Externalización/rotación pendiente registrada.

## Mapa de clases

| Clase/paquete | Función |
| --- | --- |
| DemoApplication | Bootstrap y escaneo Spring |
| AuthController | Login, perfil y credenciales propias |
| PersonaController | Listados, adicionales, formulario, baja/reactivación, contactos/coincidencias y agregado |
| OcupacionController / ParentescoController | Lectura de catálogos |
| PersonaService | Validación, transacciones, DTOs, direcciones y relaciones/limpieza |
| CuentaService | Username, BCrypt, perfil del header y credenciales |
| PersonaRepository | JPA, SQL nativo agregado, búsqueda, advisory lock y DELETE de huérfanos |
| UsuarioRepository | Username, protección ROLE_ADMIN y IDs administradores en lote |
| Repositorios de catálogo | CRUD y resolución exacta por ID/nombre |
| JwtUtil / JwtFilter | HS256, una hora, subject y autenticación stateless |
| SecurityConfig | CORS, autenticación, CSRF deshabilitado y BCrypt |

DTOs separan PersonaResumenDTO (tabla), PersonaDetalleDTO (adicionales), PersonaDTO (formulario), ContactoDTO y agregados. PUT del titular devuelve PersonaActualizadaDTO (ok y PersonaResumenDTO de la fila editada); otras escrituras devuelven ResultadoDTO; DELETE, 204. El perfil UsuarioActualDTO incluye idPersona para identificar cambios de la cuenta activa.

## Modelo y reglas

Titular por PerfilTitular con PK compartida; no es_titular en SQL. Activo si fecha_baja null. Direcciones solo en direccion_titular, orden principal cero; perfil/DTO sin direccion/ciudad.

Alta: advisory lock, validar personales/comunicaciones/contactos/direcciones, contar 20 activos, guardar titular, crear/reutilizar contactos y vincular. Una transacción y confirmación 201; no devuelve ID.

Actualizar: personales/ocupación, reemplazo de direcciones y sincronización de comunicaciones; no sustituye contactos desde PersonaDTO. Ocupación desconocida se crea; parentesco debe existir. Reactivar no adquiere el mismo lock, por lo que el límite no está protegido en toda concurrencia.

Baja: solo activo, prohíbe cuenta ROLE_ADMIN, conserva datos. Reactivación: solo dado de baja, rechaza si ya hay 20 activos. Contactos mínimo uno sin máximo; direcciones entre 1 y 20. Datos del contacto pertenecen a una Persona compartida; parentesco al vínculo.

PUT contactos sustituye conjunto completo; ausentes se desvinculan. Cleanup después de saveAndFlush elimina la persona solo sin perfil/cuenta/vínculos entrantes o salientes. Los vínculos no hacen cascada REMOVE hacia la persona.

Listados son DTO reducido construido desde entidades, no proyección SQL especializada; solo municipio principal. Detalles: género/fecha/direcciones. Formulario no incluye contactos rellenados. Contactos: SQL string_agg y Server-Timing. Dashboard: agregados y top 5. No paginación.

## Seguridad y errores

Login/OPTIONS públicos; demás peticiones requieren autenticación. JWT HS256, sub=username, duración 3600000 ms. Filtro no crea autoridades ni revalida rol/baja/existencia de cuenta. No hay refresh/revocación/health endpoint. La caída del backend se maneja en Angular al hacer una petición.

Los controllers no unifican errores: POST/PUT/DELETE tienen mapeos distintos de RuntimeException; algunos endpoints delegan en Spring. No garantizar formato JSON/código para todos los fallos internos sin integración HTTP.

## SQL y pruebas

Ejecutar [schema.sql](src/main/resources/schema.sql), después [data.sql](src/main/resources/data.sql), una vez sobre base vacía. No migraciones activas; IF NOT EXISTS no elimina columnas. Semilla con IDs explícitos, solo persona_id_seq reajustada y direcciones no idempotentes; varios campos iniciales pendientes de completar.

2026-10-15: ejecución seleccionada de 43 pruebas unitarias, todas aprobadas, sin fallos/errores. JwtUtilTest: 1; CuentaServiceTest: 7; PersonaContratosTest: 5; RegistroCompletoTest: 30. Las 13 de DemoApplicationTests se excluyeron expresamente; no se ejecutó integración con PostgreSQL.

Integración requiere TEST_DATABASE_URL local /nomina_backend_test y ejecuta TRUNCATE CASCADE. Nunca usar desarrollo. [Variables y procedimiento](../../docs/OPERACION_Y_PRUEBAS.md). Trazas ERROR de casos negativos no equivalen a fallo de suite.

## Guía PDF e índice de fuentes

- [PDF](../../docs/back/Guia_backend_archivos_y_lineas.pdf): documentación técnica e índice de declaraciones/tablas con líneas calculadas.
- [Manifiesto](../../docs/back/referencias_backend.json): rutas, SHA-256, line counts y referencias, sin cuerpos de configuración/semilla.
- [Generador](../../docs/back/generar_guia_backend.py): lee Markdown/fuentes, no reescribe README ni publica secretos/datos personales.

```powershell
python ../../docs/back/generar_guia_backend.py --date 2026-10-29
```

Requiere ReportLab/pypdf, usa fuente del sistema si existe y fallback portable. Mermaid se conserva como notación textual en PDF. Regenerar después de modificar fuentes; las líneas son de una revisión, no IDs estables.

scripts/HashPassword.java es una utilidad interactiva BCrypt con coste 12, mínimo 12 caracteres/máximo 72 bytes. Su política difiere de edición de cuenta. Ver procedimiento en Operación; no copiar credenciales/hashes a entregables.

Los métodos declarados de controllers, servicios, repositorios, seguridad, entidades, PersonaDTO y la utilidad BCrypt tienen comentarios breves de propósito. Getters y setters describen el dato expuesto; las operaciones de negocio resumen su validación o efecto. No se modificaron contratos ni lógica al documentarlos.

Edición del titular: PATCH /api/personas/{id} intercambia solo campos modificados y sus valores persistidos. El frontend compara con una copia en memoria, omite peticiones sin cambios y fusiona deltas de lista/detalles sin GET posterior. Las colecciones modificadas se envían completas; PUT completo permanece disponible en la API por compatibilidad.
