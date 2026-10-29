# Contrato HTTP vigente

## Convenciones

Base local: `http://localhost:8080`. Swagger UI esta disponible en `/swagger-ui/index.html`; el documento OpenAPI JSON, en `/v3/api-docs`. Ambos recursos de documentacion son publicos. En Swagger UI, usa **Authorize** y pega unicamente el token JWT de una cuenta administradora para probar operaciones protegidas. Todos los endpoints de aplicacion, excepto `POST /api/auth/login`, requieren un JWT asociado a una cuenta vigente con `rol=ROLE_ADMIN`. El filtro vuelve a consultar la cuenta y toma el rol actual de la base en cada peticion. JWT invalido/vencido o cuenta inexistente: 401; cuenta existente con otro rol: 403. El login tambien rechaza cuentas que no sean administradoras con 403. OPTIONS esta permitido globalmente. CORS declara `http://localhost:4200` en los controllers. No hay versionado `/v1` ni paginacion.

Los IDs JSON corresponden a `Long`, las fechas a `LocalDate` (`YYYY-MM-DD`) y las comunicaciones a arreglos de cadenas. Este documento usa nombres y tipos; no contiene credenciales ni registros personales de la semilla.

## Endpoints

| Método | Ruta | Entrada | Respuesta exitosa |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `username`, `password` | 200: `message`, `username`, `token`, `usuarioActual` |
| GET | `/api/auth/me` | Identidad del JWT | 200: `UsuarioActualDTO` |
| GET | `/api/auth/me/login` | Identidad del JWT | 200: `{username:string}` |
| PUT | `/api/auth/me/login` | `EditarCuentaDTO` | 200: `{ok:true}` |
| GET | `/api/personas` | — | 200: `PersonaResumenDTO[]` de activos |
| GET | `/api/personas/inactivos` | — | 200: `PersonaResumenDTO[]` de dados de baja |
| GET | `/api/personas/resumen` | — | 200: `ResumenDTO` |
| GET | `/api/personas/{id}` | ID titular activo | 200: `PersonaDTO` completo para editar |
| GET | `/api/personas/{id}/detalles` | ID titular activo | 200: `PersonaDetalleDTO` |
| POST | `/api/personas` | `PersonaDTO` con `contactosEmergencia` | 201: `{ok:true}` |
| PATCH | `/api/personas/{id}` | Objeto parcial con campos modificados | 200: `PersonaActualizadaDTO` (`ok` y objeto parcial `persona`) |
| PUT | `/api/personas/{id}` | `PersonaDTO` completo, sin sustituir contactos | 200: `PersonaActualizadaDTO` (`ok` y fila `persona`); compatibilidad |
| DELETE | `/api/personas/{id}` | ID titular activo | 204, sin cuerpo; baja lógica |
| PUT | `/api/personas/{id}/reactivar` | Sin cuerpo útil | 200: `{ok:true}` |
| GET | `/api/personas/{id}/contactos` | ID titular activo | 200: `ContactoDTO[]`; header `Server-Timing` |
| PUT | `/api/personas/{id}/contactos` | `ContactoDTO[]` completo | 200: `{ok:true}` |
| POST | `/api/personas/contactos/coincidencias` | `BusquedaContactoDTO` | 200: `ContactoDTO[]` de candidatos |
| GET | `/api/ocupaciones` | — | 200: objetos `{id,nombre}` |
| GET | `/api/parentescos` | — | 200: objetos `{id,nombre}`, ordenados por ID |

`PUT /api/personas/{id}` devuelve `{ok:true,persona:PersonaResumenDTO}` construido dentro de la misma transacción. El frontend reemplaza esa fila por ID y no hace otro GET del listado ni del formulario para reflejar el guardado. Los detalles almacenados de esa persona se invalidan; los de los demás permanecen. `usuarioActual.idPersona`, tanto en login como en `/auth/me`, identifica de forma inequívoca la cuenta del encabezado.

`POST /api/personas` crea una unidad transaccional y no devuelve su ID. La UI vuelve al listado después de guardar. No hay endpoint de alta de usuario, refresco/revocación JWT, salud del backend, borrado físico de titular.

## DTOs de lectura

```typescript
type Direccion = {
  pais: string; estado: string; municipio: string; colonia: string;
  codigoPostal: string; calle: string; numero: string;
};
type PersonaResumenDTO = {
  id: number; nombre: string; apellido: string; ocupacion: string;
  correos: string[]; telefonos: string[]; fechaBaja: string | null;
  direcciones: { municipio: string }[]; puedeEliminar: boolean;
};
type PersonaDetalleDTO = {
  genero: string; fechaNacimiento: string; direcciones: Direccion[];
};
type PersonaDTO = {
  id: number | null; nombre: string; apellido: string;
  fechaNacimiento: string; genero: string; ocupacion: string;
  fechaBaja: string | null; correos: string[]; telefonos: string[];
  direcciones: Direccion[]; contactosEmergencia?: ContactoDTO[];
};
type ContactoDTO = {
  idContacto: number | null; nombre: string | null; apellido: string | null;
  fechaNacimiento: string | null; genero: string | null;
  correos: string[] | null; telefonos: string[] | null;
  idParentesco: number | null; parentesco: string | null;
};
type PersonaActualizadaDTO = { ok: boolean; persona: PersonaResumenDTO };
type UsuarioActualDTO = { idPersona: number; nombre: string; correo: string | null };
type ResumenDTO = {
  total: number; conCorreo: number; conTelefono: number;
  ocupaciones: { nombre: string; cantidad: number }[];
};
```

Los tipos anteriores describen respuestas y nulabilidad del código; no son un esquema de validación automático. `PersonaDTO.contactosEmergencia` se omite al ser null y no se rellena en `obtenerPorId`. Los contactos se leen por su ruta independiente. No existen campos JSON `direccion`, `ciudad`, `correo` singular ni `telefono` singular para titulares.

El listado devuelve **solo la primera dirección**, reducida a municipio; el arreglo puede quedar vacío. Los detalles incluyen todas las direcciones ordenadas por `orden ASC, id ASC` y no incluyen nombre, apellido, ocupación ni comunicaciones. `puedeEliminar` es false cuando existe un usuario vinculado con `rol=ROLE_ADMIN`; es una ayuda a la UI y la baja vuelve a comprobarlo en el servicio.

El resumen agrega titulares activos. `conCorreo`/`conTelefono` cuentan existencia de al menos una comunicación. `ocupaciones` es top 5, orden por cantidad descendente y nombre como desempate. En contactos, `Server-Timing` tiene formato `contactos;dur=<milisegundos>` y mide la llamada de servicio, no el tiempo completo de red. CORS no declara ese header como exposed header; verlo en DevTools no implica que HttpClient pueda leerlo desde otro origen.

## Alta y actualización de titular

Campos efectivos de escritura: `nombre`, `apellido`, `fechaNacimiento`, `genero`, `ocupacion`, `correos`, `telefonos`, `direcciones`; `contactosEmergencia` solo interviene en alta. ID y baja no se toman del body para estas operaciones. `aceptaTerminos`, controles de nombres separados y `cp` no pertenecen al DTO.

| Campo/regla | Validación explícita del servicio |
| --- | --- |
| `nombre`, `apellido` | No nulos/blank, hasta 100 caracteres; no se recortan al asignar titular |
| `fechaNacimiento` | No nula; no hay regla de edad ni prohibición de fechas futuras |
| `genero` titular | Se asigna, sin validación explícita; SQL requiere no null y máximo 50 |
| `ocupacion` alta | Obligatoria y no blank; se busca por nombre y se crea si no existe |
| `ocupacion` edición | Si es no nula/no blank se busca o crea; si se omite se conserva |
| `correos` | Al menos uno; no null; hasta 150; regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`; unicidad de la lista después de trim/lowercase |
| `telefonos` | Al menos uno; cadenas de exactamente diez dígitos; sin repetidos |
| `direcciones` | Entre 1 y 20 objetos no nulos; escritura reemplaza la colección completa |
| `calle` | No null/blank, hasta 255; almacenamiento con trim |
| `municipio` | No null/blank, hasta 100; almacenamiento con trim |
| `pais`, `estado`, `numero` | Hasta 100; null/blank se normaliza (`pais` a México, demás a vacío) |
| `colonia` | Hasta 150; null/blank a vacío |
| `codigoPostal` | Vacío/null o exactamente cinco dígitos; hasta 5 |

Los correos se almacenan con trim y minúsculas; teléfonos con trim. La regex de validación del titular se aplica antes de normalizar, por lo que los espacios alrededor de un correo pueden rechazarse. La unicidad SQL es por persona, no global entre todas las personas. El frontend exige todos los campos de dirección, incluido CP y número; el backend admite algunos vacíos.

## Contactos compartidos y sustitución de relaciones

`PUT /api/personas/{id}/contactos` recibe el conjunto completo deseado. IDs omitidos se desvinculan; los presentes se conservan; nuevos se agregan. El conjunto no puede estar vacío y no tiene máximo explícito.

| Modo | Campos de entrada | Efecto |
| --- | --- | --- |
| Nuevo | Sin `idContacto`; personales y comunicaciones completos; parentesco | Crea `Persona` sin perfil titular y vincula |
| Reutilizado | `idContacto` positivo y `idParentesco` o nombre de parentesco | Cambia/crea solo la relación; preserva datos personales |
| Actualización compartida | ID y todos los campos personales/comunicaciones | Modifica la misma persona; afecta sus otros titulares |

Enviar algún campo personal con un ID hace obligatorios todos los datos personales. Nombre y apellido: no blank, máximo 100; fecha: obligatoria; género: no blank. Correos y teléfonos cumplen las mismas reglas anteriores. No hay validación explícita de longitud 50 del género del contacto, pero SQL sí la impone.

IDs positivos y únicos; no autorreferencia. El contacto existente debe no tener perfil o tener perfil activo. Parentesco: ID positivo existente o nombre exacto no blank de hasta 50; no se crea catálogo. Correos/teléfonos enviados en distintos contactos de la solicitud no pueden repetirse. La búsqueda de coincidencias excluye el ID que se está actualizando y rechaza coincidencias sin confirmación/reutilización con 409.

Al quitar la última referencia se elimina físicamente la persona de contacto solo si no tiene perfil titular, cuenta ni vínculos entrantes/salientes. El DELETE SQL conserva personas compartidas o protegidas. Sus correos/teléfonos se eliminan por ON DELETE CASCADE.

## Coincidencias

Entrada: `{correos?:string[], telefonos?:string[], excluirId?:number}`. Requiere al menos un valor; valida formato correo y teléfono. Busca por **OR** entre comunicaciones, normalizando correos. `excluirId` excluye la propia persona. Candidatos: personas referenciadas como contacto, o personas sin perfil ni cuenta. No es un buscador universal de cualquier titular/administrador. El DTO de candidato lleva personales y comunicaciones, con parentesco/ID de parentesco null.

## Cuenta y login

Login devuelve 404 si no encuentra username, 401 si BCrypt no coincide y 403 si la cuenta no tiene `ROLE_ADMIN`. El body es Map, sin validación Bean Validation explícita; entradas incompletas pueden terminar en errores distintos a esos casos. Las peticiones posteriores vuelven a validar que la cuenta exista y conserve su rol actual.

`EditarCuentaDTO`: `username`, `passwordActual`, `passwordNueva`. Se exige username de 1–50 caracteres tras trim, sin espacios; contraseña actual válida; nueva opcional, mínimo 8 caracteres y máximo 72 bytes UTF-8. Username ocupado: 409; username inválido, incluido el exceso de longitud: 400. La entidad JPA, la validación del servicio, el formulario y el SQL comparten el límite de 50. Guardado exitoso no devuelve un token nuevo; el frontend cierra sesión y pide iniciar de nuevo.

## Errores y límites HTTP

| Camino | Tratamiento implementado |
| --- | --- |
| Login | 404/401 con objeto `{message}` |
| Validaciones de servicio | `ResponseStatusException` (normalmente 400); conflictos 409; titular no encontrado 404 |
| POST personas | Conserva código de `ResponseStatusException`; IllegalArgumentException/RuntimeException se traducen a 400 con texto |
| PUT/DELETE persona | Conserva `ResponseStatusException`; IllegalArgumentException a 400; otras RuntimeException a 404 con texto |
| GET listado activo | Conserva `ResponseStatusException`; IllegalArgumentException 400; RuntimeException 500 con texto |
| Reactivar | 404 si no está dado de baja, 409 si hay 20 activos; otros fallos por manejo de Spring |
| Baja administrador | 403, sin cambiar su fecha de baja |
| GET por ID/detalles/contactos, PUT contactos, cuenta | Excepciones se propagan al manejo de Spring; cuerpo final depende de esa configuración |

No se garantiza un JSON uniforme de errores ni un código uniforme para fallos de persistencia. Un 404 en PUT/DELETE puede ocultar un fallo interno traducido por el controller. El interceptor frontend cierra sesión ante 401, 0, timeout y 5xx de la API, pero no ante 403 ni errores de validación. Las pruebas unitarias no sustituyen una prueba HTTP real de filtros, serialización y base.

### Edicion parcial del titular

`PATCH /api/personas/{id}` requiere JWT. El frontend compara contra el formulario original en memoria y envia exclusivamente campos modificados: `nombre`, `apellido`, `genero`, `fechaNacimiento`, `ocupacion`, `correos`, `telefonos`, `direcciones`. Los campos omitidos se conservan; null explicito se rechaza. Las colecciones se sustituyen completas solamente cuando cambian.

Ejemplo de peticion: `{ "nombre": "Nuevo nombre" }`. Respuesta: `{ "ok": true, "persona": { "nombre": "Nuevo nombre" } }`. `persona` es un objeto parcial con los valores persistidos de los campos enviados; no incluye el resto del formulario ni repite la fila completa. PUT completo sigue disponible por compatibilidad.

La respuesta se fusiona por ID con la lista y los detalles en memoria. No hay GET posterior al guardar. Una edicion sin cambios no genera peticion. El encabezado se actualiza localmente solo cuando cambia nombre completo o correo principal de la cuenta activa.
