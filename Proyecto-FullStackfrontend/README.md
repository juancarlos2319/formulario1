# Frontend de formularios

Aplicación Angular 18.2 y TypeScript 5.5 para autenticación y administración de titulares y contactos de emergencia. Se comunica con la API Spring Boot en `http://localhost:8080`.

## Requisitos y ejecución

Instala Node.js y npm. Desde `Proyecto-FullStackfrontend/`, ejecuta `npm ci` y `npm start`; abre `http://localhost:4200/`. El backend y PostgreSQL deben estar disponibles para iniciar sesión y guardar datos.

## Funciones y rutas

Rutas principales: `/inicio` (login), `/dashboard`, `/personas`, `/personas/desactivadas`, `/registro`, `/registro/:id`, `/contactos` y `/contactos/:id`. Las rutas administrativas requieren autenticación. Desde “Personas” se abre la lista de titulares dados de baja y se pueden reactivar.

El alta conserva los datos del titular como borrador en el flujo y crea el registro al guardar sus contactos. Se admiten varios contactos y se debe conservar al menos uno. Al editar, se conserva `idContacto` para reutilizar la persona y modificar su vínculo/parentesco.

El formulario de contactos pide nombre, apellido, fecha de nacimiento, género, correo, teléfono y parentesco. La API solo exige nombre, apellido y teléfono para una persona nueva; con `idContacto` conserva los datos personales existentes. Consulta el [contrato de la API](../Proyecto-FullStackbackend/demo/README.md) antes de modificar estos campos.

## Integración con la API

La URL local de la API es `http://localhost:8080`. Al cambiar de entorno, revisa `AuthService`, `RegistroService` y `jwt.interceptor.ts`; el backend debe permitir el origen `http://localhost:4200`.

## Autenticación

El JWT se almacena en `localStorage`; el borrador de alta usa `sessionStorage`. El interceptor agrega la autorización y limpia la sesión ante respuestas 401 o 403.

## Validación

Ejecuta `npm run build` para compilar y `npm test` para las pruebas unitarias con Jasmine/Karma. `package.json` no configura pruebas E2E.

