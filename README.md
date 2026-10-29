# Sistema de administración de personas

Aplicación cliente-servidor para administrar titulares, direcciones múltiples, comunicaciones, contactos de emergencia compartidos y cuentas de acceso. Revisión documental: **29 de octubre de 2026**. Esta documentación describe el código versionado; no certifica el estado de una base de datos ya instalada.

## Documentación técnica

| Documento | Contenido |
| --- | --- |
| [Arquitectura](docs/ARQUITECTURA.md) | Capas, flujos, transacciones, autenticación y cachés |
| [Contrato HTTP](docs/API.md) | Endpoints, DTOs, validaciones y respuestas |
| [Persistencia](docs/BASE_DE_DATOS.md) | Tablas, restricciones, relaciones, índices y semilla |
| [Operación y pruebas](docs/OPERACION_Y_PRUEBAS.md) | Instalación, configuración, ejecución, verificación y diagnóstico |
| [Revisión técnica](docs/REVISION_TECNICA.md) | Inconsistencias, límites de la implementación y cobertura comprobada |
| [Frontend](Frontend/README.md) | Pantallas, rutas, formularios, servicios y Angular Material |
| [Guía de funcionamiento Angular](razi/Guia_Funcionamiento_Angular.docx) | Componentes, señales, RxJS, formularios y flujos |
| [Detalle de migración Angular 22](razi/Detalle_Migracion_Angular_22.docx) | Cambios por capa y componente; Angular 18 a 22, Vitest y animaciones |
| [Backend](Backend/demo/README.md) | Paquetes Java, reglas de negocio y generación de documentación |
| [Guía PDF del backend](docs/back/Guia_backend_archivos_y_lineas.pdf) | Documentación técnica exportada e índice de fuentes con líneas |
| [Generador y manifiesto del PDF](docs/back/generar_guia_backend.py) | Generación reproducible e inventario verificable de fuentes |
| [Especificación frontend](docs/front/FRONTEND_ESPECIFICACION_AGENTES.md) · [backend](docs/back/BACKEND_ESPECIFICACION_AGENTES.md) | Invariantes y contexto técnico para cada parte |

## Organización del repositorio

```text
  docs/                                  Toda la documentación y artefactos documentales
    back/                                Documentación y referencias específicas del backend
    front/                               Documentación específica del frontend
razi/Guia_Funcionamiento_Angular.docx Guía explicada del frontend Angular
razi/Detalle_Migracion_Angular_22.docx Informe de migración Angular 22
Frontend/
  src/app/                             Aplicación Angular standalone
  src/styles.scss                      Entrada global de estilos
  src/material-typography.scss          Tema Material 3 y tipografía
  angular.json                         Build, servidor y pruebas
Backend/demo/
  src/main/java/com/example/demo/       API Spring y persistencia JPA
  src/main/resources/schema.sql        Esquema para una base nueva
  src/main/resources/data.sql          Semilla de desarrollo
  src/test/java/                       Pruebas unitarias e integración
  scripts/HashPassword.java            Utilidad interactiva BCrypt
```

## Tecnologías comprobadas

| Capa | Dependencias y configuración |
| --- | --- |
| Frontend | Angular/Material/CDK 22.x, TypeScript 6.x, RxJS 7.8.x y Zone.js 0.16.x; versiones exactas en `package-lock.json` |
| Compilación web | Angular CLI con `@angular/build`, Sass y Vitest/jsdom para pruebas |
| Backend | Java 21, Spring Boot 4.1.1, Spring MVC, Security, Data JPA y JDBC |
| Autenticación | JJWT 0.11.5, HS256; contraseñas BCrypt |
| Persistencia | PostgreSQL, SQL nativo con funciones específicas de PostgreSQL |
| Herramientas | Maven Wrapper 3.9.16; generador Python con ReportLab y pypdf |

El proyecto no declara una versión concreta de servidor PostgreSQL, contenedores, pipeline CI ni pruebas E2E.

## Inicio local

1. Crear una base **vacía** y ejecutar `schema.sql` seguido de `data.sql`, una sola vez. Ver [procedimiento y límites](docs/OPERACION_Y_PRUEBAS.md).
2. Configurar la conexión y la clave de firma del backend sin copiar sus valores a la documentación.
3. Desde `Backend/demo`, ejecutar `mvnw.cmd spring-boot:run`.
4. Desde `Frontend`, ejecutar `npm.cmd ci` y `npm.cmd start`.

El frontend espera `http://localhost:8080/api/` y se sirve normalmente en `http://localhost:4200`. Las URLs están codificadas en los servicios y en el interceptor, no centralizadas en un archivo de entorno.

## Modelo funcional vigente

- Una persona es titular cuando tiene una fila en `perfil_titular`; no existe `persona.es_titular`.
- Un titular activo tiene `perfil_titular.fecha_baja IS NULL`; el límite de servicio es 20 titulares activos.
- Las direcciones se almacenan exclusivamente en `direccion_titular`; no existen columnas `direccion` ni `ciudad` en `perfil_titular`.
- Cada alta necesita al menos una dirección, un correo, un teléfono y un contacto de emergencia. Las direcciones tienen un máximo de 20; los contactos no tienen máximo explícito.
- El parentesco pertenece a la relación titular/contacto. Editar los datos personales del contacto modifica la persona compartida.
- El listado transporta un resumen; los detalles y el formulario completo tienen contratos independientes.
- La sesión se limpia ante 401, fallo de conexión, respuesta 5xx o timeout de la API local. La detección ocurre al realizar una petición; no hay monitor periódico del backend.

Las restricciones del formulario, del servicio Java y del SQL no son idénticas. Las diferencias están registradas en la [revisión técnica](docs/REVISION_TECNICA.md), sin modificar reglas de negocio durante esta actualización documental.
