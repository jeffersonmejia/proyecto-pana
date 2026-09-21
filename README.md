# PANA System

Sistema web para la gestión del Proyecto PANA.

## Estructura general

- Código del backend PHP en `/src` (`app`, `config`, `database`, `routes`, `storage`).
- Punto de entrada PHP en `/public` y configuración de Composer en la raíz.
- Aplicación web Angular en `/web`.
- MySQL como base de datos.
- Arquitectura backend por capas.
- API REST JSON.
- Material Design 3 en frontend.
- Configuración sensible mediante `.env`.
- Requerimientos y seguimiento local en `harness/` (ignorado por Git).

El endpoint inicial de salud es `GET /api/health`; comprueba la conexión PDO/MySQL configurada en `.env`.
La aplicación Angular está en `web/` y usa `web/proxy.conf.json` para conectarse al backend local.

## Autenticación

La API usa `firebase/php-jwt` para access tokens y refresh tokens rotativos en cookie `HttpOnly`.
Configura `JWT_SECRET` en `.env` con una clave aleatoria y ejecuta `composer install` desde la raíz antes de usar las rutas de autenticación.
La migración `src/database/migrations/002_authentication.sql` solo crea tablas en el esquema seleccionado; no crea, selecciona ni elimina bases de datos.
La migración `src/database/migrations/003_access_management.sql` carga los permisos base y se importa después de la 002.
Para una instalación nueva, `src/database/schema.sql` reúne ambas estructuras en un único archivo, sin crear ni seleccionar bases de datos. Úsalo en vez de importar las dos migraciones por separado.
Importa ese archivo únicamente con tu propia base (la indicada por `DB_DATABASE` en `.env`) seleccionada en phpMyAdmin.

## Regla de ejecución

El usuario controla `run`, instalaciones, migraciones, servidores y comandos que modifiquen el entorno.
Consultar `AGENTS.md` antes de trabajar.
