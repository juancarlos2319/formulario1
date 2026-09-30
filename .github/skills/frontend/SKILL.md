---
name: frontend
description: "Usa cuando se implementen, depuren o revisen pantallas, servicios, rutas, formularios o pruebas Angular del frontend."
---

# Flujo de trabajo frontend

1. Lee `Proyecto-FullStackfrontend/AGENTS.md`, `Proyecto-FullStackfrontend/docs/ESPECIFICACION_AGENTES.md` y las instrucciones aplicables.
2. Traza el flujo afectado de ruta/componente a servicio, interfaz y API; revisa pruebas y patrones próximos antes de diseñar.
3. Para cambios de API, contrasta campos, autenticación y comportamiento con `Proyecto-FullStackbackend/demo/README.md`. Si hay incompatibilidad, informa qué lado debe coordinarse.
4. Implementa el cambio con el patrón Angular existente. Conserva accesibilidad, validaciones visibles y estados de carga/error donde aplique.
5. Añade o actualiza pruebas para el comportamiento observable y ejecuta `npm run build`; ejecuta `npm test` si aplica y el entorno lo permite.
6. Resume archivos y comportamiento modificados; separa claramente validaciones ejecutadas de las no ejecutadas.