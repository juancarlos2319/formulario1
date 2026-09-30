# Contexto de agentes — Frontend

Aplicación Angular 18 con TypeScript 5.5, componentes standalone, Angular Router, HttpClient y RxJS. Lee `docs/ESPECIFICACION_AGENTES.md` para el mapa funcional y los comandos.

## Reglas rápidas

- Mantén las capas actuales: componentes en `src/app/components/`, servicios en `services/`, contratos en `interfaces/`, guards e interceptors en sus carpetas.
- Antes de cambiar una petición, compara el contrato con `Proyecto-FullStackbackend/demo/README.md` y conserva los nombres JSON existentes.
- Respeta rutas protegidas, flujo JWT y borrador de registro; no muevas datos personales a almacenamiento persistente sin necesidad.
- Mantén los estilos locales/globales donde corresponden y evita añadir dependencias si Angular ya resuelve el caso.
- Añade o actualiza pruebas junto al comportamiento modificado. Ejecuta `npm run build`; ejecuta `npm test` cuando el cambio amerite pruebas unitarias.
- No afirmes que una validación pasó si no se ejecutó.