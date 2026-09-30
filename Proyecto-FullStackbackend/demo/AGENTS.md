# Contexto de agentes — Backend

API Java 21 con Spring Boot 4.1.1, Spring MVC, Spring Security, Spring Data JPA, JWT y PostgreSQL. Lee `docs/ESPECIFICACION_AGENTES.md` y `README.md` antes de cambiar reglas funcionales o contratos.

## Reglas rápidas

- Conserva la separación controller → service → repository y los DTOs de `dto/`; evita exponer entidades JPA directamente en nuevos contratos.
- Mantén las operaciones multi-entidad transaccionales y respeta las invariantes de titulares/contactos descritas en la especificación.
- No cambies rutas, códigos HTTP ni nombres JSON sin actualizar el frontend y la documentación API.
- No escribas credenciales, secretos JWT, datos personales ni tokens en código, documentación, logs o pruebas. La configuración actual contiene valores sensibles: no los copies; usa variables de entorno al modificar configuración y recomienda rotar cualquier secreto ya expuesto.
- Las pruebas de integración pueden borrar datos de su base configurada: ejecútalas solo con una base local desechable independiente, nunca con la base de desarrollo.
- Ejecuta `./mvnw test` (Windows: `mvnw.cmd test`) desde `demo/` cuando sea seguro; indica si pruebas de integración fueron omitidas por falta de configuración.