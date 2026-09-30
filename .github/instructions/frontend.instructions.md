---
name: frontend-reglas
description: "Reglas para cambios en la aplicación Angular del frontend."
applyTo: "Proyecto-FullStackfrontend/**/*"
---

- Lee `Proyecto-FullStackfrontend/AGENTS.md` y `Proyecto-FullStackfrontend/docs/ESPECIFICACION_AGENTES.md` antes de editar.
- Usa TypeScript estricto y sigue el estilo Angular existente (componentes standalone, inyección y RxJS ya presentes); no migres arquitectura como parte de una tarea puntual.
- Mantén tipados de interfaces y respuestas HTTP alineados con el backend. Evita `any` nuevo si se conoce el tipo.
- No hardcodees secretos. Mantén una única configuración coherente para URL base de API cuando trabajes en endpoints; no cambies el endpoint sin coordinar backend.
- Actualiza las pruebas y ejecuta `npm run build` desde `Proyecto-FullStackfrontend/`.