# Instalación, operación y verificación

## Requisitos y versiones

- JDK 21 con `java` accesible desde la terminal.
- Node.js y npm compatibles con Angular 18; `package.json` no fija `engines` ni hay `.nvmrc`. Usar el lockfile para resolver dependencias.
- PostgreSQL con una base de desarrollo vacía y permisos de creación de tablas/índices/secuencias. No hay Docker Compose versionado.
- Chrome disponible para Karma/ChromeHeadless.
- Python con `reportlab` y `pypdf` si se necesita regenerar el PDF. Estas dependencias son del generador documental, no de la API.

Los comandos siguientes se ejecutan manualmente. La revisión documental no recrea, vacía ni modifica bases instaladas.

## 1. Crear el esquema de desarrollo

Crear una base nueva con la herramienta habitual de PostgreSQL y ejecutar, en este orden:

```powershell
psql -X -v ON_ERROR_STOP=1 -d <base_nueva> -f Proyecto-FullStackbackend/demo/src/main/resources/schema.sql
psql -X -v ON_ERROR_STOP=1 -d <base_nueva> -f Proyecto-FullStackbackend/demo/src/main/resources/data.sql
```

`<base_nueva>` es un marcador que debe sustituirse. No pegar estos comandos sin ajustarlo. Configurar autenticación de PostgreSQL fuera de argumentos registrados o documentación. Los SQL son manuales; la configuración actual no garantiza ejecutarlos automáticamente al arrancar Spring.

`CREATE TABLE IF NOT EXISTS` no elimina columnas existentes. Para obtener la estructura actual sin `direccion`/`ciudad`, usar una base vacía. No aplicar `data.sql` varias veces: sus direcciones no son idempotentes. La reconstrucción borra datos si previamente se decide eliminar la base; esa acción no forma parte de los comandos anteriores.

## 2. Configurar y arrancar el backend

Ubicación: `Proyecto-FullStackbackend/demo/src/main/resources/application.properties`. Se revisaron nombres de propiedades y opciones no sensibles; se omitieron valores de conexión y firma.

| Propiedad | Estado comprobado |
| --- | --- |
| `spring.datasource.url` | Valor literal configurado; debe apuntar a la base elegida |
| `spring.datasource.username`, `.password` | Valores literales; no deben copiarse ni versionarse al cambiar entorno |
| `spring.datasource.driver-class-name` | Driver configurado |
| `jwt.secret` | Valor literal; firma HS256, debe mantenerse fuera de entregables compartidos |
| `spring.jpa.hibernate.ddl-auto` | `update` |
| `spring.jpa.show-sql` | `true` |
| `spring.jpa.properties.hibernate.dialect` | `org.hibernate.dialect.PostgreSQLDialect` |

El archivo actual no utiliza placeholders para esas credenciales. No asumir que `DATABASE_URL` o `JWT_SECRET` se consumen automáticamente: deben vincularse mediante configuración Spring/overrides y verificarse. El generador PDF no incluye los valores.

```powershell
# Desde Proyecto-FullStackbackend/demo
.\mvnw.cmd spring-boot:run
```

Linux/macOS: `./mvnw spring-boot:run`. El puerto esperado es 8080. La URL CORS local permitida es `http://localhost:4200`. No hay endpoint health propio ni Spring Actuator en el POM.

## 3. Instalar y arrancar el frontend

```powershell
# Desde Proyecto-FullStackfrontend
npm.cmd ci
npm.cmd start
```

En otras shells usar `npm ci`/`npm start`. En PowerShell, `.cmd` evita depender de la política de ejecución de `npm.ps1`. El servidor usa configuración development y puerto 4200 salvo override explícito.

La API se referencia en `AuthService`, `PersonasService` y `jwtInterceptor`. El servicio de CP está en `CodigoPostalService`. Cambiar solo un archivo de URL no configura completamente otro entorno. Cambiar las entradas `styles` de `angular.json` requiere reiniciar `ng serve`; la entrada vigente es `src/styles.scss`, que usa Sass para cargar el tema Material.

## 4. Compilación

```powershell
npm.cmd run build
```

Salida: `Proyecto-FullStackfrontend/dist/formulario-registro/browser`. La configuración production usa hashing. Presupuestos declarados:

| Presupuesto | Warning | Error |
| --- | --- | --- |
| `initial` | 500 kB | 1026 kB |
| `anyComponentStyle` | 2 kB | 4 kB |

La última verificación pasó con paquete inicial aproximado de 1.01 MB y estilos globales de 36.00 kB. Hay advertencias de tamaño inicial y de varios estilos locales; no son errores de compilación. La optimización del tema incluye únicamente componentes Material utilizados. Añadir un módulo nuevo puede requerir su mixin de tema.

## 5. Pruebas frontend

```powershell
npm.cmd test -- --watch=false --browsers=ChromeHeadless
```

La suite usa Jasmine/Karma, HttpTestingController y pruebas de componentes standalone. En esta revisión: **94 pruebas aprobadas**, salida 0. Se comprobaron respuestas HTTP simuladas, invalidación de cachés, guards/flujos de sesión, formularios, navegación, feedback y timeout/errores del interceptor.

No hay script E2E, configuración Playwright/Cypress ni prueba de todos los flujos conectados a una base real. Una prueba de componentes no verifica el contrato efectivo Spring/Jackson/PostgreSQL. Existe una verificación visual previa del login en Chrome; no equivale a cobertura visual de todas las resoluciones/pantallas.

## 6. Pruebas backend

```powershell
# Desde Proyecto-FullStackbackend/demo
.\mvnw.cmd test
```

En un entorno que resuelve erróneamente la caché como `C:\.m2\repository`, puede indicarse la carpeta Maven existente:

```powershell
.\mvnw.cmd "-Dmaven.repo.local=<ruta_de_cache_maven>" test
```

No cambiar variables de entorno de usuario/sistema como HOME para corregir este problema.

| Clase | Resultado de la revisión |
| --- | --- |
| `JwtUtilTest` | 1 aprobada |
| `CuentaServiceTest` | 7 aprobadas |
| `PersonaContratosTest` | 5 aprobadas |
| `RegistroCompletoTest` | 30 aprobadas |
| `DemoApplicationTests` | 13 excluidas expresamente; sin integración |
| Total Surefire de la selección unitaria | 43 reportadas/ejecutadas, 0 fallos/errores; integración no incluida |

Para reproducir la selección unitaria, añadir `"-Dtest=JwtUtilTest,CuentaServiceTest,PersonaContratosTest,RegistroCompletoTest"` a `mvnw.cmd test`. Esta selección no inicia DemoApplicationTests aunque haya variables TEST_DATABASE_* presentes.

Las trazas ERROR de casos negativos de contactos aparecen durante la suite por el logger del servicio; no indican por sí mismas una prueba fallida. Hay warnings de deprecación/adjunción de agente Mockito; la ejecución terminó en BUILD SUCCESS.

### Integración PostgreSQL, solo sobre una base desechable

`DemoApplicationTests` requiere `TEST_DATABASE_URL` que coincida con:

```text
jdbc:postgresql://(localhost|127.0.0.1):<puerto>/nomina_backend_test
```

Variables adicionales: `TEST_DATABASE_USERNAME` (default postgres) y `TEST_DATABASE_PASSWORD` (default vacío). La condición JUnit comprueba URL local/nombre, no demuestra que la base sea desechable.

```powershell
$env:TEST_DATABASE_URL = 'jdbc:postgresql://127.0.0.1:55439/nomina_backend_test'
# Configurar TEST_DATABASE_USERNAME y TEST_DATABASE_PASSWORD en la sesión según la instancia.
.\mvnw.cmd test
```

Antes de ejecutar, confirmar que es una instancia/base independiente de desarrollo. `@BeforeEach` crea el esquema y ejecuta `TRUNCATE ... RESTART IDENTITY CASCADE`; estas pruebas destruyen los datos de la base indicada. Sustituyen `ddl-auto` por `none` y `spring.sql.init.mode` por `never`; no usan `data.sql` como preparación.

## 7. Contraseñas y documentación

La utilidad `scripts/HashPassword.java` solicita contraseña y confirmación mediante `Console`, exige al menos 12 caracteres y máximo 72 bytes UTF-8 y genera BCrypt con coste 12. No recibe secretos mediante argumentos. La edición de cuenta de la API usa mínimo 8 y el encoder Spring por defecto; no son políticas idénticas.

```powershell
.\mvnw.cmd dependency:build-classpath -DincludeScope=runtime "-Dmdep.outputFile=target/runtime-classpath.txt"
$runtimeClasspath = (Get-Content target/runtime-classpath.txt -Raw).Trim()
java --class-path $runtimeClasspath scripts/HashPassword.java
```

No registrar hashes ni claves resultantes en commits o documentos. Para la guía:

```powershell
python docs/generar_guia.py --date 2026-10-15
```

Ejecutar desde backend/demo. Produce PDF y manifiesto; no modifica README ni reproduce cuerpos de fuentes que puedan contener secretos. Las fuentes de documentación son Markdown y las referencias de líneas se calculan nuevamente.

## 8. Diagnóstico

| Síntoma | Comprobación concreta |
| --- | --- |
| Login vuelve ante una petición | Examinar estado 401/0/5xx y timeout; el cierre es deliberado |
| Backend cae pero la pantalla permanece | No hay polling; un resultado en caché no realiza HTTP |
| Campos Material sin estilos | Ver entrada `styles.scss`, import Sass y reiniciar servidor tras cambio de `angular.json` |
| Fuentes distintas en otra máquina | Comprobar Google Fonts y conexión; se usan familias de respaldo si falla |
| Guardado con 404 pero registro existe | Controller PUT puede traducir una RuntimeException interna a 404 |
| Username largo falla aunque formulario lo acepta | SQL limita 50; validación frontend/backend permite 255 |
| Nueva ocupación falla con PK | Revisar secuencia del catálogo tras semilla con IDs explícitos |
| No se ven cambios de otro cliente | Caché en memoria sin TTL ni invalidación remota; recargar |
| ChromeHeadless no inicia | Comprobar instalación/permisos de Chrome y entorno; no confundir con fallo de assertions |

## Alcance de los resultados

Fecha de verificación: 2026-10-15. Se ejecutaron build y suites, además de revisión estática de fuentes. No se ejecutaron recreación de base, integración PostgreSQL, pruebas de carga, pentest, despliegue ni pruebas E2E. Actualizar esta sección con evidencia nueva cuando se ejecuten esas verificaciones.
