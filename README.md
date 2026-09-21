# PANA System

Sistema web para la gestión del Proyecto PANA.

## Estructura general

- Backend PHP en la raíz.
- Aplicación web Angular en `/web`.
- MySQL como base de datos.
- Arquitectura backend por capas.
- API REST JSON.
- Material Design 3 en frontend.
- Configuración sensible mediante `.env`.
- Requerimientos y seguimiento local en `harness/` (ignorado por Git).

El endpoint inicial de salud es `GET /api/health`; comprueba la conexión PDO/MySQL configurada en `.env`.
La aplicación Angular está en `web/` y usa `web/proxy.conf.json` para conectarse al backend local.

## Regla de ejecución

El usuario controla `run`, instalaciones, migraciones, servidores y comandos que modifiquen el entorno.
Consultar `AGENTS.md` antes de trabajar.
