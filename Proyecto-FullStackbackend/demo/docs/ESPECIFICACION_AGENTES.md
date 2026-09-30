- `GET /api/formularios/inactivos` lista solo titulares con baja lógica; `PUT /api/formularios/{id}/reactivar` restaura uno si el límite de 20 titulares activos no se ha alcanzado.
# Especificación de contexto — Backend

## Stack y ejecución

- Java 21, Spring Boot 4.1.1, Spring MVC, Spring Security, Spring Data JPA, PostgreSQL y JWT.
- Ejecutar desde `Proyecto-FullStackbackend/demo/`: `mvnw.cmd spring-boot:run`; pruebas: `mvnw.cmd test`.
- API local en puerto 8080. CORS de desarrollo permite el frontend `http://localhost:4200`.
- La configuración SQL está en `src/main/resources/application.properties`. No copies valores de ese archivo a código o documentación; usa variables de entorno para configuración sensible.

## Arquitectura

- `controller/`: endpoints REST; `service/`: reglas de negocio y transacciones; `repository/`: acceso a datos.
- `dto/`: contratos HTTP; `model/`: entidades JPA; `security/` y `config/`: JWT y Spring Security.
- `schema.sql` y `data.sql` son scripts manuales. No asumas que se aplican automáticamente ni que Hibernate sustituye las migraciones.
- Para rutas, cuerpos, respuestas y errores, consulta la tabla “Rutas” y secciones de registro del `README.md`; actualízalo si cambia el contrato.

## Invariantes de negocio

- `persona.es_titular` distingue titulares de personas creadas solo como contactos. El listado principal contiene titulares activos; el límite de negocio documentado es 20 titulares activos.
- Cada titular registrado requiere al menos un contacto; no hay máximo. Una misma persona puede estar compartida por varios titulares y tener parentescos distintos.
- `persona_contacto_emergencia` representa el vínculo y su parentesco. No permitas autorreferencias ni IDs duplicados dentro de una solicitud.
- `GET /api/formularios/inactivos` lista titulares con baja lógica; `PUT /api/formularios/{id}/reactivar` restaura uno si el límite de 20 titulares activos no se ha alcanzado.
- Al quitar un vínculo conserva contactos compartidos. Si pierde la última referencia, elimina persona y comunicaciones solo si no tiene perfil de titular, cuenta ni vínculos salientes; hazlo en la misma transacción.
- Para reutilizar contacto existente se envía `idContacto`; para un contacto nuevo se envían sus datos. Al reemplazar la lista de contactos, IDs omitidos se desvinculan y los presentes se conservan.
- Para reutilizar un contacto existente se envía `idContacto`; solo con `idParentesco` se modifica el vínculo, y enviando todos los datos personales también se actualiza la persona compartida. Al reemplazar la lista, conserva IDs de los demás vínculos.
- Ocupaciones y parentescos provienen de catálogos existentes; no crees catálogos de forma implícita durante el registro.

## Seguridad y pruebas

- Login público: `POST /api/auth/login`; las rutas de negocio requieren JWT Bearer. Preserva autorización y códigos HTTP actuales.
- No registres credenciales, tokens, secretos JWT ni datos personales. Si un secreto fue versionado, recomienda rotarlo y externalizarlo; no lo repitas.
- Las pruebas de integración pueden crear tablas y vaciar datos. Úsalas solo con una base local desechable independiente configurada por las variables TEST_* documentadas en el README, nunca con la base de desarrollo.
- Actualiza entidades, DTOs, frontend y README al modificar persistencia o contratos.
- `POST /api/formularios/contactos/coincidencias` consulta por correo/teléfono antes de confirmar reutilización. El guardado rechaza duplicados sin ID (409). La migración `20260930_contactos_compartidos.sql` añade índices; no fusiona duplicados existentes.
