# Despliegue de PANA en cPanel

## Estructura recomendada

- `public_html/`: contenido de `web/dist/pana-web` y su `.htaccess` de Angular.
- `pana-api/`: raíz privada con `src/`, `vendor/`, `.env` y `composer.json`.
- `public_html/api/`: copia del contenido de `public/` con `index.php` ajustado para cargar `pana-api/src`.
- `pana-storage/`: directorio privado para temporales; los archivos de usuarios y respaldos se guardan en Nextcloud.

La raíz pública no debe contener `.env`, `src/`, `vendor/`, migraciones ni respaldos.

## Automatización con Git Version Control

El repositorio incluye `.cpanel.yml` y `deployment/cpanel/deploy.sh`. Al ejecutar el despliegue de Git en cPanel, el hook:

1. Instala dependencias del frontend y genera el build de producción.
2. Copia el backend a `$HOME/pana-api` y ejecuta Composer sin dependencias de desarrollo.
3. Publica Angular en `$HOME/public_html` y el API en `$HOME/public_html/api`.
4. Conserva `.env` dentro de `$HOME/pana-api`; nunca lo copia desde Git.

Se pueden cambiar las rutas con `DEPLOY_WEB_ROOT` y `DEPLOY_API_ROOT` en el entorno del hook. El script no crea ni modifica la base de datos ni ejecuta migraciones.

## Preparación inicial

1. Configurar el repositorio en cPanel Git Version Control y habilitar el despliegue mediante `.cpanel.yml`.
2. Crear `$HOME/pana-api/.env` con `APP_URL`, `FRONTEND_URL`, MySQL, JWT y Nextcloud de producción.
3. Ejecutar el primer despliegue; cPanel instalará dependencias y publicará frontend y API.

## Configuración de Apache

Usar `deployment/cpanel/frontend.htaccess` en `public_html/` y `deployment/cpanel/api.htaccess` dentro de `public_html/api/`. El API debe apuntar a una instalación PHP 8.1 o superior y la extensión PDO MySQL, cURL y SimpleXML habilitadas.

## Base de datos y seguridad

Crear la base MySQL desde cPanel, importar `src/database/schema.sql` y aplicar las migraciones en orden durante una ventana controlada. No se ejecutan migraciones automáticamente al publicar. Activar HTTPS, configurar CORS con el dominio real, generar un JWT secreto nuevo y usar una contraseña de aplicación de Nextcloud.

## Git de cPanel

Si el proveedor habilita Git Version Control, configurar el repositorio en una carpeta privada y publicar solo `web/dist/pana-web` y `public/`. Mantener `vendor/` fuera de `public_html` y ejecutar Composer desde la terminal de cPanel según las herramientas disponibles.

## Comprobación final

Verificar `/api/health`, inicio de sesión, rutas Angular al recargar, subida de documentos y respaldos en Nextcloud. Revisar que una petición a `/.env` y `/src/` devuelva 404 o 403.
