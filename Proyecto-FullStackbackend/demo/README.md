# Backend de formularios

Java 21, Spring Boot 4.1.1, JPA y PostgreSQL. El backend administra titulares y sus contactos de emergencia como personas relacionadas.

[Guía PDF de archivos y líneas](docs/Guia_backend_archivos_y_lineas.pdf).

## Funcionamiento

El frontend envía JSON al controlador; PersonaService valida y coordina transacciones; los repositorios persisten entidades. Un contacto es una fila de `persona`, y `persona_contacto_emergencia` une al titular con esa persona y un parentesco de `catalogo_parentesco`.

- `persona.es_titular = true`: aparece en el listado principal y cuenta en el límite de 20 titulares activos.
- `es_titular = false`: persona creada solo como contacto; no aparece en ese listado ni cuenta en el límite.
- Un titular también puede ser contacto de otro titular. No puede ser su propio contacto.
- Se exige **mínimo un contacto, sin máximo**. Un contacto puede estar relacionado con varios titulares, con parentescos diferentes.
- Quitar una relación no elimina la persona compartida ni sus teléfonos. Los contactos sin relaciones se conservan.

## Configuración

La conexión a `nomina_db` y `jwt.secret` se configuran en `src/main/resources/application.properties`. Contiene valores directos; no usa referencias a DB_PASSWORD/JWT_SECRET. CORS admite `http://localhost:4200`.

```powershell
.\mvnw.cmd spring-boot:run
```

El puerto predeterminado es 8080. Los SQL no se ejecutan automáticamente con la configuración PostgreSQL actual. Como la base aún no se ha creado, usa directamente los scripts actuales.

## Autenticación

POST `/api/auth/login` compara usuario y BCrypt, y devuelve `message`, `username` y `token`. Los **tokens nuevos duran una hora** (3600000 ms). Los tokens ya emitidos conservan su vencimiento original.

Enviar `Authorization: Bearer <token>` en las rutas protegidas. JwtFilter establece la identidad en SecurityContextHolder; ApiAuthFilter añade comprobaciones JWT/CORS. El flujo actual no comprueba rol ni baja de la cuenta durante login o validación de un token. El login devuelve 404 si no existe usuario y 401 si la contraseña no coincide.

## Rutas

| Método y ruta | Función |
| --- | --- |
| POST `/api/auth/login` | Obtener token de una hora |
| GET `/api/formularios` | Listar titulares activos con lista completa de contactos |
| POST `/api/formularios` | Registrar titular y al menos un contacto |
| PUT `/api/formularios/{id}` | Actualizar datos y comunicaciones de titular activo |
| DELETE `/api/formularios/{id}` | Baja lógica del titular |
| GET `/api/formularios/{id}/contactos` | Consultar todas las relaciones de contacto |
| PUT `/api/formularios/{id}/contactos` | Sustituir la lista de relaciones (mínimo una) |
| GET `/api/ocupaciones` | Catálogo de ocupaciones |
| GET `/api/parentescos` | Catálogo de parentescos, ordenado por ID |

Las validaciones explícitas producen 400 y un titular inexistente/inactivo produce 404. Los errores generales conservan el manejo previo de cada controlador; no hay todavía un formato uniforme de errores.

## Registro y actualización

El titular necesita nombre, apellido, fecha de nacimiento, ocupación al crear, dos correos y dos teléfonos. Las reglas de comunicaciones existentes se mantienen. Los contactos nuevos necesitan nombre, apellido y un teléfono de diez dígitos; no necesitan fecha de nacimiento ni ocupación.

Ejemplo de alta con una persona de contacto nueva:

```json
{
  "nombre": "María",
  "apellido": "López",
  "fechaNacimiento": "1995-06-15",
  "ocupacion": "Docente",
  "email": "maria@example.com",
  "telefono": "5512345678",
  "correosAdicionales": ["maria.secundario@example.com"],
  "telefonosAdicionales": ["5587654321"],
  "contactosEmergencia": [
    {
      "nombre": "Ana",
      "apellido": "Pérez",
      "telefono": "5511111111",
      "idParentesco": 9
    }
  ]
}
```

Consultar GET `/api/parentescos` para elegir un ID existente. También se admite `parentesco` por nombre exacto cuando no se envía idParentesco; no se crean valores nuevos desde el formulario.

Para vincular una persona existente, enviar su ID, no el ID de la relación:

```json
{"idContacto": 3, "idParentesco": 9}
```

Con `idContacto`, se reutiliza a la persona activa y se ignoran nombre/apellido/teléfono enviados: esta operación modifica el vínculo y parentesco, no los datos compartidos. Para crear una persona nueva, omitir idContacto y proporcionar sus datos completos.

Cada elemento devuelto contiene `idContacto`, `nombre`, `apellido`, `telefono`, `idParentesco` y `parentesco`. El formulario devuelve `contactosEmergencia` completa y conserva los campos singulares del primer contacto por compatibilidad. Los IDs permiten compartir personas y conservarlas en futuras ediciones.

PUT de contactos recibe la lista completa que debe quedar vinculada. Los IDs ausentes se desvinculan; los presentes se conservan y pueden cambiar de parentesco; los elementos sin ID crean personas nuevas. Reenviar IDs evita duplicar personas. PUT general no modifica contactos: usar la ruta específica.

Se rechazan listas vacías, IDs repetidos, autorreferencias, parentescos inexistentes y personas de contacto inexistentes/dadas de baja. Las modificaciones son transaccionales; si una relación falla, se revierten las personas y relaciones nuevas de la operación. El límite de 20 titulares todavía no tiene bloqueo para solicitudes concurrentes.

El frontend anterior necesita adaptarse: incluir apellido al crear contactos, conservar idContacto al editar y permitir listas de longitud variable.

## SQL inicial

Ejecuta primero [schema.sql](src/main/resources/schema.sql) y después [data.sql](src/main/resources/data.sql) sobre una base vacía. Estos scripts ya contienen el modelo actual: `catalogo_parentesco`, `persona.es_titular` y `persona_contacto_emergencia`.

La semilla marca Carlos y Laura como titulares y las personas de soporte como contactos. Los scripts están pensados para una base nueva; no hay archivos de migración en el proyecto. Evita ejecutar `data.sql` más de una vez: correos y teléfonos no tienen una restricción de unicidad por contenido y podrían duplicarse.

## Generar un hash

```powershell
.\mvnw.cmd dependency:build-classpath -DincludeScope=runtime "-Dmdep.outputFile=target/runtime-classpath.txt"
$runtimeClasspath = (Get-Content target/runtime-classpath.txt -Raw).Trim()
java --class-path $runtimeClasspath scripts/HashPassword.java
```

La utilidad pide contraseña y confirmación y devuelve BCrypt; guardar el hash en usuario.password. El modelo Usuario todavía no mapea id_persona, aunque el esquema SQL sí la exige.

## Pruebas existentes

- RegistroCompletoTest: 14 pruebas unitarias de listas variables, contactos compartidos, validación, distinción de titulares y límite.
- JwtUtilTest: vigencia exacta de una hora y conservación del usuario.
- DemoApplicationTests: 7 pruebas con PostgreSQL sobre persistencia, rollback, conservación de personas compartidas, PUT repetido y restricciones SQL.

Sin TEST_DATABASE_URL, Maven omite las 7 pruebas de integración. Para ejecutarlas, usar exclusivamente una base local desechable llamada nomina_backend_test: estas pruebas crean tablas y vacían sus datos.

```powershell
$env:TEST_DATABASE_URL = 'jdbc:postgresql://127.0.0.1:55439/nomina_backend_test'
$env:TEST_DATABASE_USERNAME = 'postgres'
# Configurar TEST_DATABASE_PASSWORD si la instancia lo exige.
.\mvnw.cmd test
```

Validación de este cambio: 22 pruebas aprobadas con PostgreSQL 17 temporal. No se utilizó la base de trabajo nomina_db.

## Documentación PDF

El generador calcula referencias de líneas, verifica cobertura y omite secretos en el PDF. Requiere Python, reportlab, pypdf y fuentes Arial/Consolas de Windows.

```powershell
python docs/generar_guia.py
```

Revisar también las descripciones cuando cambia el comportamiento; recalcular líneas no actualiza automáticamente su significado.

<!-- GUIA_ARCHIVOS -->

## Guía de archivos y líneas

Referencias calculadas sobre las fuentes actuales. En IntelliJ, Ctrl+G permite ir a una línea. El PDF incluye código numerado.

### DemoApplication.java

Archivo: [src/main/java/com/example/demo/DemoApplication.java](src/main/java/com/example/demo/DemoApplication.java). 13 líneas.

Punto de entrada del backend. Arranca Spring y descubre los componentes del paquete de aplicación.

- Línea 6: Activa configuración automática y descubrimiento de componentes.
- Línea 10: Inicia el contexto de aplicación y el servidor.

### AuthController.java

Archivo: [src/main/java/com/example/demo/controller/AuthController.java](src/main/java/com/example/demo/controller/AuthController.java). 61 líneas.

Recibe las credenciales y genera el token. El login usa directamente UsuarioRepository, PasswordEncoder y JwtUtil.

- Línea 14: Agrupa las rutas bajo /api/auth.
- Línea 27: Define POST /api/auth/login.
- Línea 29: Lee username del cuerpo JSON; la línea siguiente lee password.
- Línea 34: Busca la cuenta. El bloque siguiente responde 404 si no existe.
- Línea 43: Compara la contraseña recibida con BCrypt. Si falla se devuelve 401.
- Línea 53: Emite un JWT con el nombre de usuario.
- Línea 55: Devuelve message, username y token. No hay comprobación de rol ni de baja en el método.

### FormularioController.java

Archivo: [src/main/java/com/example/demo/controller/FormularioController.java](src/main/java/com/example/demo/controller/FormularioController.java). 90 líneas.

Expone las rutas de personas y contactos. Delega reglas en PersonaService y transforma resultados/excepciones en respuestas HTTP.

- Línea 13: Prefijo /api/formularios.
- Línea 14: Permite el origen localhost:4200 y los métodos/encabezados declarados.
- Línea 21: Consulta contactos de una persona identificada por la URL.
- Línea 26: Recibe una lista de ContactoDTO para guardarla.
- Línea 36: Lista activos; captura RuntimeException como 500 con texto.
- Línea 50: Recibe FormularioDTO, devuelve 201 y convierte RuntimeException en 400.
- Línea 64: Actualiza por ID; devuelve 200 o 404 ante RuntimeException, incluso cuando es un error de validación.
- Línea 78: Baja lógica: 204 sin cuerpo, o 404 si se captura una excepción.

### OcupacionController.java

Archivo: [src/main/java/com/example/demo/controller/OcupacionController.java](src/main/java/com/example/demo/controller/OcupacionController.java). 20 líneas.

Consulta el catálogo directamente a través de su repositorio.

- Línea 9: Ruta /api/ocupaciones.
- Línea 16: Define la consulta GET.
- Línea 18: Lee y devuelve todas las ocupaciones con 200.

### PersonaService.java

Archivo: [src/main/java/com/example/demo/service/PersonaService.java](src/main/java/com/example/demo/service/PersonaService.java). 295 líneas.

Registra titulares y relaciona personas de contacto con parentescos. Las operaciones se ejecutan dentro de transacciones.

- Línea 18: Devuelve todas las relaciones del titular activo.
- Línea 23: Sustituye la lista completa; exige al menos uno y no impone máximo.
- Línea 42: Lista exclusivamente titulares activos, no personas creadas solo como contacto.
- Línea 48: Valida titular, contactos y comunicaciones antes del alta transaccional.
- Línea 53: El límite de 20 cuenta solo titulares; no hay bloqueo concurrente.
- Línea 59: Identifica el registro principal como titular.
- Línea 61: Persiste persona y relaciones dentro de la misma transacción.
- Línea 66: Actualiza datos/comunicaciones de titular activo; los contactos se gestionan en su propia ruta.
- Línea 98: Baja lógica del titular, sin borrar personas ni relaciones compartidas.
- Línea 119: Incluye la lista completa en la respuesta, además de los campos singulares del primero.
- Línea 134: Devuelve comunicaciones secundarias; la siguiente línea hace lo mismo con teléfonos.
- Línea 166: Exige nombre y apellido de hasta 100 caracteres y fecha de nacimiento a los titulares.
- Línea 174: Rechaza personas dadas de baja o que solo sean contactos con 404.
- Línea 186: Mínimo uno; rechaza IDs repetidos e inválidos. Las personas nuevas necesitan nombre, apellido y teléfono.
- Línea 207: Busca parentesco existente por ID o nombre exacto; no crea catálogo desde el formulario.
- Línea 213: Reutiliza personas activas por ID o crea personas de contacto. Rechaza autorreferencias.
- Línea 227: La persona nueva creada como contacto no cuenta como titular.
- Línea 250: Quita relaciones omitidas; orphanRemoval elimina solo los vínculos, nunca personas compartidas.
- Línea 253: Devuelve ID de persona, nombre, apellido, teléfono y parentesco de la relación.
- Línea 260: Mantiene dos correos y dos teléfonos completos para titulares.
- Línea 277: Crea posiciones faltantes y actualiza comunicaciones principales/secundarias.

### SecurityConfig.java

Archivo: [src/main/java/com/example/demo/config/SecurityConfig.java](src/main/java/com/example/demo/config/SecurityConfig.java). 62 líneas.

Configura la cadena de seguridad y los beans de autenticación.

- Línea 19: Habilita esta configuración de seguridad.
- Línea 33: Desactiva protección CSRF.
- Línea 34: Habilita integración CORS.
- Línea 35: No mantiene la autenticación en una sesión HTTP de Spring Security.
- Línea 38: Permite OPTIONS.
- Línea 39: Permite rutas de autenticación en esta cadena. ApiAuthFilter exceptúa exactamente login.
- Línea 42: El resto exige identidad autenticada, sin una condición de rol.
- Línea 45: Añade JwtFilter antes del filtro username/password. ApiAuthFilter se inyecta pero no se añade explícitamente aquí.
- Línea 52: Devuelve un servicio que rechaza consultas; el login se resuelve en el controlador.
- Línea 60: Proporciona el comparador/codificador BCrypt.

### JwtUtil.java

Archivo: [src/main/java/com/example/demo/security/JwtUtil.java](src/main/java/com/example/demo/security/JwtUtil.java). 42 líneas.

Firma y analiza JWT con HS256. No consulta cuentas en la base.

- Línea 17: Lee jwt.secret desde configuración.
- Línea 19: Vigencia fija de 3600000 milisegundos: una hora.
- Línea 22: Crea la clave a partir de los bytes UTF-8 del secreto.
- Línea 27: Coloca el username como sujeto.
- Línea 29: Calcula el vencimiento desde la hora actual.
- Línea 30: Firma con HS256.
- Línea 38: Analiza y verifica firma y vencimiento; después obtiene el sujeto. Un token incorrecto produce excepción.

### JwtFilter.java

Archivo: [src/main/java/com/example/demo/security/JwtFilter.java](src/main/java/com/example/demo/security/JwtFilter.java). 50 líneas.

Construye la autenticación que Spring Security utiliza para permitir las rutas protegidas.

- Línea 17: Registra el filtro como componente administrado por Spring.
- Línea 27: Lee Authorization.
- Línea 32: Retira el prefijo Bearer y conserva el JWT.
- Línea 34: Verifica el token y obtiene el usuario. Los errores se capturan y registran en consola.
- Línea 40: Crea autenticación solo si hay sujeto y el contexto aún no tiene una.
- Línea 43: Construye autenticación sin autoridades/roles.
- Línea 45: Guarda la identidad en el contexto para las siguientes reglas de seguridad.
- Línea 48: Continúa la cadena; las reglas posteriores decidirán el acceso cuando no hubo autenticación.

### ApiAuthFilter.java

Archivo: [src/main/java/com/example/demo/security/ApiAuthFilter.java](src/main/java/com/example/demo/security/ApiAuthFilter.java). 46 líneas.

Añade encabezados CORS y otra comprobación de JWT para rutas API. No establece identidad en SecurityContextHolder.

- Línea 11: Puede registrarse como filtro del contenedor por Spring Boot, aunque no aparezca en addFilterBefore. No debe considerarse inactivo.
- Línea 14: Recibe JwtUtil por constructor.
- Línea 17: Recibe petición, respuesta y la cadena que puede continuar.
- Línea 19: Añade permisos CORS solo para el origen localhost:4200.
- Línea 23: Indica a cachés que la respuesta depende del origen.
- Línea 25: Reconoce preconsulta CORS del origen admitido; responde 204 y termina.
- Línea 30: Obtiene la ruta solicitada.
- Línea 31: Revisa rutas API, exceptuando OPTIONS y exactamente /api/auth/login.
- Línea 35: Exige encabezado y prefijo; a continuación analiza el JWT y exige sujeto no nulo.
- Línea 40: Ante error devuelve 401 sin cuerpo y termina.
- Línea 44: Continúa al siguiente filtro/controlador. Si Spring Security rechazó antes, la solicitud puede no llegar a este filtro.

### FormularioDTO.java

Archivo: [src/main/java/com/example/demo/dto/FormularioDTO.java](src/main/java/com/example/demo/dto/FormularioDTO.java). 65 líneas.

Contrato del titular con comunicaciones y lista variable de contactos.

- Línea 6: Exactamente un correo secundario exigido por el servicio.
- Línea 7: Exactamente un teléfono secundario.
- Línea 8: Lista de mínimo un contacto, sin máximo; se recibe al crear y se rellena en respuestas.
- Línea 17: ID del titular.
- Línea 27: Valor no validado ni persistido actualmente.
- Línea 28: Campos singulares del primer contacto conservados por compatibilidad.
- Línea 35: Accesores para serialización y uso del servicio.

### ContactoDTO.java

Archivo: [src/main/java/com/example/demo/dto/ContactoDTO.java](src/main/java/com/example/demo/dto/ContactoDTO.java). 5 líneas.

Contrato de una relación de contacto. Los IDs distinguen una persona existente de una nueva.

- Línea 4: idContacto es el ID de persona, no el ID del vínculo. Sin ID se exigen nombre, apellido y teléfono; idParentesco o parentesco identifican el catálogo.

### Persona.java

Archivo: [src/main/java/com/example/demo/model/Persona.java](src/main/java/com/example/demo/model/Persona.java). 88 líneas.

Datos compartidos por titulares y contactos. Las colecciones se ordenan por ID ascendente.

- Línea 9: Mapea la tabla persona.
- Línea 21: Permite fecha nula para personas creadas como contacto.
- Línea 36: Marca explícita para distinguir titular de contacto.
- Línea 40: Ocupación opcional en persistencia; el alta del titular la exige en servicio.
- Línea 45: Colección de vínculos salientes; cascada y eliminación de huérfanos solo sobre relaciones.
- Línea 49: Correos ordenados por ID: primero principal y restantes adicionales.
- Línea 53: Teléfonos ordenados del mismo modo.
- Línea 57: Consulta la distinción de rol de registro, independiente del rol del usuario de login.
- Línea 79: Accesor singular conservado: devuelve la primera relación.

### CatalogoOcupacion.java

Archivo: [src/main/java/com/example/demo/model/CatalogoOcupacion.java](src/main/java/com/example/demo/model/CatalogoOcupacion.java). 21 líneas.

Nombre de ocupación reutilizado por personas.

- Línea 6: Identifica la tabla SQL.
- Línea 9: IDENTITY delega la generación de ID en la base.
- Línea 13: Campo persistido; las anotaciones Column cercanas describen restricciones del mapeo.
- Línea 17: Inicio de accesores para leer/escribir campos; no contienen validación de negocio.

### PersonaCorreo.java

Archivo: [src/main/java/com/example/demo/model/PersonaCorreo.java](src/main/java/com/example/demo/model/PersonaCorreo.java). 27 líneas.

Correo asociado a una persona; longitud alineada en 150 con SQL y servicio.

- Línea 6: Mapea persona_correo.
- Línea 9: Identificador generado por base.
- Línea 13: Vincula al padre por id_persona.
- Línea 16: Longitud y obligatoriedad del correo.
- Línea 25: Acceso al valor para construir el DTO.

### PersonaTelefono.java

Archivo: [src/main/java/com/example/demo/model/PersonaTelefono.java](src/main/java/com/example/demo/model/PersonaTelefono.java). 27 líneas.

Teléfono asociado a una persona; SQL/JPA admiten 30 caracteres y el alta HTTP exige diez dígitos.

- Línea 6: Mapea persona_telefono.
- Línea 9: Identificador generado por base.
- Línea 13: Relación ManyToOne a persona.
- Línea 16: Longitud alineada con schema.sql.
- Línea 25: Devuelve el número.

### ContactoEmergencia.java

Archivo: [src/main/java/com/example/demo/model/ContactoEmergencia.java](src/main/java/com/example/demo/model/ContactoEmergencia.java). 36 líneas.

Entidad de unión entre dos personas, con parentesco propio de cada vínculo. No contiene nombre o teléfono duplicados.

- Línea 8: Mapea persona_contacto_emergencia; UNIQUE evita repetir el par titular/contacto.
- Línea 7: Impide autorreferencia también al generar el esquema JPA.
- Línea 16: Referencia al titular.
- Línea 21: Referencia a la persona compartida, sin cascada de borrado.
- Línea 25: Referencia al catálogo de parentescos.
- Línea 32: Acceso a los datos de la persona de contacto.

### Usuario.java

Archivo: [src/main/java/com/example/demo/model/Usuario.java](src/main/java/com/example/demo/model/Usuario.java). 33 líneas.

Cuenta con username, hash y rol. No mapea id_persona aunque el script SQL lo declara obligatorio/único.

- Línea 6: Identifica la tabla SQL.
- Línea 10: IDENTITY delega la generación de ID en la base.
- Línea 17: Campo persistido; las anotaciones Column cercanas describen restricciones del mapeo.
- Línea 19: Guarda el rol pero el login/filtros actuales no lo verifican.
- Línea 22: Inicio de accesores para leer/escribir campos; no contienen validación de negocio.

### PersonaRepository.java

Archivo: [src/main/java/com/example/demo/repository/PersonaRepository.java](src/main/java/com/example/demo/repository/PersonaRepository.java). 12 líneas.

Acceso a personas con consultas explícitas para titulares activos.

- Línea 9: Hereda persistencia y búsqueda por ID para titulares y contactos.
- Línea 10: Lista solo titulares activos.
- Línea 11: Cuenta solo titulares activos, excluyendo contactos del límite de 20.

### CatalogoOcupacionRepository.java

Archivo: [src/main/java/com/example/demo/repository/CatalogoOcupacionRepository.java](src/main/java/com/example/demo/repository/CatalogoOcupacionRepository.java). 11 líneas.

Consultas y persistencia de ocupaciones.

- Línea 9: Hereda save, saveAndFlush, findById, findAll y otras operaciones; el ID es Long.
- Línea 10: Spring Data deriva la consulta del nombre del método.
- Línea 10: Expresa que la búsqueda puede no encontrar coincidencia.

### UsuarioRepository.java

Archivo: [src/main/java/com/example/demo/repository/UsuarioRepository.java](src/main/java/com/example/demo/repository/UsuarioRepository.java). 9 líneas.

Consultas y persistencia de cuentas.

- Línea 7: Hereda save, saveAndFlush, findById, findAll y otras operaciones; el ID es Long.
- Línea 8: Spring Data deriva la consulta del nombre del método.
- Línea 8: Expresa que la búsqueda puede no encontrar coincidencia.

### application.properties

Archivo: [src/main/resources/application.properties](src/main/resources/application.properties). 11 líneas.

Configuración de conexión, clave JWT e Hibernate. Los secretos se omiten en el PDF sin alterar números de línea.

- Línea 1: Nombre de aplicación.
- Línea 2: Conexión PostgreSQL a nomina_db.
- Línea 3: Usuario de la conexión.
- Línea 4: Contraseña configurada directamente; valor omitido en esta copia.
- Línea 6: Clave de firma configurada directamente; valor omitido.
- Línea 9: update solicita ajustar el esquema JPA; no equivale a ejecutar data.sql.
- Línea 10: Muestra consultas SQL.
- Línea 11: Dialecto PostgreSQL. No aparece habilitación de inicialización SQL automática.

### schema.sql

Archivo: [src/main/resources/schema.sql](src/main/resources/schema.sql). 75 líneas.

Esquema con contactos como personas y unión N a N con parentesco.

- Línea 12: Catálogo de parentescos.
- Línea 19: Datos de titulares y contactos; fecha/ocupación pueden ser nulas.
- Línea 29: Marca explícita; contactos por defecto.
- Línea 36: Unión entre titular y contacto con parentesco.
- Línea 44: Restricción que evita repetir el par.
- Línea 45: Prohíbe una persona como contacto de sí misma.
- Línea 49: Facilita búsqueda de relaciones entrantes.
- Línea 52: Correos de hasta 150 caracteres.
- Línea 60: Teléfonos de hasta 30 caracteres.
- Línea 68: Cuenta con id_persona obligatorio, todavía no mapeado en la entidad Usuario.

### data.sql

Archivo: [src/main/resources/data.sql](src/main/resources/data.sql). 71 líneas.

Semilla con ocupaciones, parentescos, dos titulares, dos contactos-persona, comunicaciones y cuentas.

- Línea 6: Siete ocupaciones iniciales.
- Línea 19: Once parentescos iniciales.
- Línea 36: Incluye es_titular: true para administradores y false para contactos.
- Línea 46: Correos iniciales; repetir la semilla puede duplicarlos.
- Línea 52: Teléfonos de titulares y contactos.
- Línea 60: Vínculos titular/contacto/parentesco; evita duplicar el mismo par.
- Línea 66: Cuentas con hashes BCrypt; no se verificaron contraseñas.
- Línea 71: Ajusta la secuencia de usuarios después de IDs explícitos.

### pom.xml

Archivo: [pom.xml](pom.xml). 137 líneas.

Define versiones, dependencias y tareas de compilación y documentación con Maven.

- Línea 7: Hereda configuración de Spring Boot; la siguiente línea fija la versión 4.1.1.
- Línea 30: Java 21.
- Línea 43: Soporte de controladores HTTP.
- Línea 73: Driver de base de datos en ejecución.
- Línea 78: Persistencia JPA y repositorios.
- Línea 82: API JWT; después aparecen implementación y Jackson.
- Línea 99: Dependencia de seguridad.
- Línea 107: Procesa documentación en prepare-package.
- Línea 132: Empaquetado y ejecución de la aplicación Spring Boot.

### HashPassword.java

Archivo: [scripts/HashPassword.java](scripts/HashPassword.java). 30 líneas.

Utilidad interactiva para crear un hash y guardarlo en usuario.password. No actualiza la base por sí sola.

- Línea 10: Exige una consola interactiva.
- Línea 14: Lee contraseña sin mostrarla; después solicita confirmación.
- Línea 17: Rechaza valores ausentes o diferentes.
- Línea 21: Exige mínimo 12 caracteres y máximo 72 bytes UTF-8.
- Línea 24: Genera e imprime BCrypt con coste 12.
- Línea 26: Limpia arrays en finally; no borra el String creado previamente.

### RegistroCompletoTest.java

Archivo: [src/test/java/com/example/demo/service/RegistroCompletoTest.java](src/test/java/com/example/demo/service/RegistroCompletoTest.java). 154 líneas.

Catorce pruebas unitarias con repositorios simulados.

- Línea 23: Inyecta mocks y configura respuestas de catálogo/guardado.
- Línea 77: Comprueba mínimo uno y respuesta con IDs/apellido.
- Línea 84: Comprueba cuatro contactos excluidos de la categoría titular.
- Línea 92: Reutiliza una persona y conserva sus datos compartidos.
- Línea 101: Quita vínculos sin borrar personas.
- Línea 108: Rechaza contacto igual al titular.
- Línea 113: Rechaza repetición de IDs en una lista.
- Línea 133: Evita operar sobre contactos a través de las rutas de titular.
- Línea 144: Comprueba el límite de altas.

### DemoApplicationTests.java

Archivo: [src/test/java/com/example/demo/DemoApplicationTests.java](src/test/java/com/example/demo/DemoApplicationTests.java). 101 líneas.

Siete pruebas de integración con PostgreSQL. Sustituyen la suite anterior que dependía de AuthService inexistente.

- Línea 18: Solo habilita una base local desechable nomina_backend_test con puerto explícito.
- Línea 24: Prueba contra el esquema SQL real, no contra uno inventado por Hibernate.
- Línea 32: Crea tablas si faltan y vacía datos de la base de prueba.
- Línea 50: Comprueba la persistencia de cuatro personas de contacto y un titular.
- Línea 59: Verifica que borrar un vínculo no borra al contacto compartido.
- Línea 70: Comprueba repetición segura cuando se conservan los IDs.
- Línea 76: Comprueba rollback del alta completa.
- Línea 83: Comprueba rollback durante sustitución de contactos.
- Línea 89: Verifica CHECK y UNIQUE en PostgreSQL.
- Línea 96: Baja lógica sin borrado de personas.

### maven-wrapper.properties

Archivo: [.mvn/wrapper/maven-wrapper.properties](.mvn/wrapper/maven-wrapper.properties). 3 líneas.

Distribución Maven usada por los lanzadores.

- Línea 1: Versión del wrapper.
- Línea 2: Modo only-script.
- Línea 3: URL de la distribución Maven.

### mvnw.cmd

Archivo: [mvnw.cmd](mvnw.cmd). 189 líneas.

Lanzador Windows: una entrada batch ejecuta PowerShell para localizar o descargar Maven y pasarle argumentos.

- Línea 35: Ejecuta la sección PowerShell del archivo.
- Línea 54: Lee la URL de propiedades del wrapper.
- Línea 102: Reutiliza distribución existente en caché.
- Línea 135: Descarga Maven si falta.
- Línea 138: Lee checksum opcional y lo verifica si está configurado.
- Línea 150: Extrae la distribución descargada.
- Línea 104: Comunica la ruta de ejecución a batch.

### mvnw

Archivo: [mvnw](mvnw). 295 líneas.

Lanzador para Unix y shells compatibles: descubre Java, reutiliza o descarga Maven y ejecuta sus argumentos.

- Línea 45: Localiza Java.
- Línea 117: Lee configuración del wrapper.
- Línea 148: Función que invoca Maven.
- Línea 153: Detecta distribución ya instalada.
- Línea 194: Selecciona descarga por wget; después considera curl y Java.
- Línea 226: Verifica checksum solo si está configurado.
- Línea 155: Invoca Maven; la primera coincidencia pertenece a la rama de caché.

### .gitignore

Archivo: [.gitignore](.gitignore). 33 líneas.

Exclusiones para archivos locales y generados; no elimina archivos ya versionados.

- Línea 2: Excluye resultados de compilación.
- Línea 3: Excluye el binario del wrapper.
- Línea 17: Excluye configuración IntelliJ.
- Línea 33: Excluye configuración VS Code.

### .gitattributes

Archivo: [.gitattributes](.gitattributes). 3 líneas.

Reglas de Git para finales de línea.

- Línea 1: Fuerza LF en el lanzador Unix.
- Línea 2: Fuerza CRLF en comandos Windows.

### CatalogoParentesco.java

Archivo: [src/main/java/com/example/demo/model/CatalogoParentesco.java](src/main/java/com/example/demo/model/CatalogoParentesco.java). 19 líneas.

Entidad del catálogo de parentescos.

- Línea 6: Tabla catalogo_parentesco.
- Línea 9: ID generado.
- Línea 12: Nombre obligatorio, único y de hasta 50 caracteres.

### CatalogoParentescoRepository.java

Archivo: [src/main/java/com/example/demo/repository/CatalogoParentescoRepository.java](src/main/java/com/example/demo/repository/CatalogoParentescoRepository.java). 9 líneas.

Acceso al catálogo por ID o nombre.

- Línea 7: Hereda operaciones de catálogo.
- Línea 8: Busca un nombre exacto para resolver el vínculo.

### ParentescoController.java

Archivo: [src/main/java/com/example/demo/controller/ParentescoController.java](src/main/java/com/example/demo/controller/ParentescoController.java). 22 líneas.

Expone el catálogo al frontend.

- Línea 9: Ruta protegida /api/parentescos.
- Línea 18: Consulta HTTP GET.
- Línea 20: Devuelve catálogo ordenado por ID.

### JwtUtilTest.java

Archivo: [src/test/java/com/example/demo/security/JwtUtilTest.java](src/test/java/com/example/demo/security/JwtUtilTest.java). 21 líneas.

Prueba de duración del token y sujeto.

- Línea 11: Genera JWT y analiza sus fechas y usuario.
- Línea 18: Verifica una hora exacta entre emisión y vencimiento.

### README.md

Este archivo reúne la explicación operativa y esta guía. Las referencias de sus secciones se incluyen en el capítulo README.md del PDF.

### Entregables documentales

- `docs/generar_guia.py`: descripciones revisadas, resolución de líneas, generación de README/PDF y comprobaciones.
- `docs/referencias_backend.json`: manifiesto con hashes SHA-256 y referencias de la revisión.
- `docs/Guia_backend_archivos_y_lineas.pdf`: documento final con índice y código numerado.

Las carpetas `.git`, `.idea` y `target` contienen metadatos o resultados generados y no forman parte de los archivos fuente explicados.
