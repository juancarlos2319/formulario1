# Backend de formularios

Requiere Java 21 y PostgreSQL. Las rutas y la respuesta del login
(`{"token":"..."}`) se mantienen. Los errores devuelven
`{"message":"..."}`, con estado 400, 401, 404, 409 o 500 según el caso.

## Configuración

Configura estas variables en la ejecución de IntelliJ o en la terminal que inicia el backend:

| Variable | Uso |
| --- | --- |
| `DB_PASSWORD` | Contraseña del usuario PostgreSQL; obligatoria. |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 bytes UTF-8; obligatorio. |
| `DB_URL` | Predeterminado: `jdbc:postgresql://localhost:5432/nomina_db`. |
| `DB_USERNAME` | Predeterminado: `postgres`. |
| `JWT_EXPIRATION_MS` | Predeterminado: `86400000` (24 horas). Debe ser positivo. |

Ejemplo para generar una clave nueva en la sesión de PowerShell:

```powershell
$jwtBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($jwtBytes) } finally { $rng.Dispose() }
$env:JWT_SECRET = [Convert]::ToBase64String($jwtBytes)
$dbCredential = Get-Credential -UserName postgres -Message 'Credencial de PostgreSQL'
$env:DB_PASSWORD = $dbCredential.GetNetworkCredential().Password
.\mvnw.cmd spring-boot:run
```

Conserva la clave JWT en la configuración privada de ejecución para los siguientes
arranques. Todas las instancias deben compartirla. Cambiarla invalida los tokens
anteriores. Spring Boot no carga archivos `.env` automáticamente.

La contraseña de PostgreSQL y la clave JWT previamente incluidas en el código
deben reemplazarse. Este cambio elimina sus valores de la configuración actual;
no cambia la contraseña del servidor ni elimina secretos del historial de Git.
Usa `\password postgres` en una sesión de psql autorizada para rotar la contraseña
sin incluirla en comandos SQL guardados.

## Usuarios administradores

El login consulta `usuario`, verifica el hash BCrypt de `password` y exige
`rol = 'ROLE_ADMIN'` y una persona asociada con `fecha_baja IS NULL`.
Cada petición autenticada vuelve a verificar que el usuario siga activo.
Eliminar el usuario, cambiarle el rol o dar de baja a su persona impide usar
sus tokens existentes. Cambiar solo su contraseña no revoca tokens ya emitidos.

Ya no hay contraseñas fijas ni usuarios de acceso insertados por `data.sql`.
Las cuentas existentes necesitan hashes BCrypt válidos de contraseñas propias.
Para generar un hash sin escribir la contraseña en el historial de la terminal:

```powershell
.\mvnw.cmd dependency:build-classpath -DincludeScope=runtime "-Dmdep.outputFile=target/runtime-classpath.txt"
$runtimeClasspath = (Get-Content target/runtime-classpath.txt -Raw).Trim()
java --class-path $runtimeClasspath scripts/HashPassword.java
```

La utilidad pide y confirma la contraseña sin mostrarla; imprime solo su hash.
Guarda ese hash en el usuario existente:

```sql
UPDATE usuario
SET password = '<HASH_BCRYPT_GENERADO>'
WHERE username = '<USUARIO_EXISTENTE>';
```

Para una base nueva, asocia la cuenta a una persona activa existente. Sustituye
los valores entre ángulos y el ID:

```sql
INSERT INTO usuario (username, password, rol, id_persona)
VALUES ('<NOMBRE_DE_USUARIO>', '<HASH_BCRYPT_GENERADO>', 'ROLE_ADMIN', 1);
```

Comprueba que el ID elegido sea el de la persona correcta; la relación es única.
Los scripts `schema.sql` y `data.sql` no se ejecutan automáticamente con la
configuración PostgreSQL actual. `ddl-auto=update` conserva la configuración
de desarrollo existente.

## Integridad y errores

Las altas adquieren un bloqueo transaccional PostgreSQL
`pg_advisory_xact_lock(20260917, 20)` antes de contar las personas activas.
El bloqueo se libera al confirmar o revertir la transacción y funciona entre
instancias del backend. Las altas manuales u otros servicios deben respetar
el mismo bloqueo y verificar el límite; no es una restricción global de SQL.

Guardar y actualizar son operaciones transaccionales: si falla la persona,
se revierten también sus cambios relacionados. Al actualizar, se crean el
primer correo y teléfono cuando no existían; valores nulos conservan los actuales.
Se rechazan nombres obligatorios vacíos, fechas de nacimiento futuras y textos
que exceden el tamaño de sus columnas. Los registros dados de baja no se editan.

Los errores inesperados se registran en el servidor y producen un mensaje
genérico al cliente. Las restricciones de datos producen 409; las solicitudes
inválidas 400; las personas inexistentes 404.

Referencias: [almacenamiento de contraseñas de Spring Security](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html)
y [bloqueos transaccionales PostgreSQL](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS).

## Pruebas

```powershell
.\mvnw.cmd test
```

Las pruebas unitarias verifican JWT, autenticación, el filtro y las respuestas HTTP.
Las de integración se habilitan solo con `TEST_DATABASE_URL` apuntando a
`jdbc:postgresql://localhost:PUERTO/nomina_backend_test` o
`jdbc:postgresql://127.0.0.1:PUERTO/nomina_backend_test`.

Usa exclusivamente una base desechable con ese nombre: las pruebas crean,
truncan y eliminan sus tablas. No utilizan `nomina_db`.
Con una instancia de pruebas ya iniciada y la base creada:

```powershell
$env:TEST_DATABASE_URL = 'jdbc:postgresql://127.0.0.1:55432/nomina_backend_test'
$env:TEST_DATABASE_USERNAME = 'postgres'
# Configura TEST_DATABASE_PASSWORD si la instancia requiere contraseña.
.\mvnw.cmd test
Remove-Item Env:TEST_DATABASE_URL
```

Las pruebas de integración comprueban altas simultáneas con 19 personas previas,
rollback de ocupaciones ante un fallo de inserción, persistencia de correo y
teléfono, validación y rechazo de administradores inactivos.

Si Maven intenta usar `C:\.m2\repository` en este entorno, añade
`"-Dmaven.repo.local=$env:USERPROFILE/.m2/repository"` a los comandos Maven.
