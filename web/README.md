# Aplicación web PANA

Aplicación Angular standalone organizada bajo `src/app` por `core`, `shared`, `layout` y `modules`.

## Configuración

- Angular y Angular Material usan la misma versión mayor, con tema Material 3.
- El tema central y los tokens visuales viven en `src/styles/theme/_theme.scss`.
- `src/environments/environment.ts` apunta a `/api`.
- `proxy.conf.json` reenvía `/api` al backend local `http://localhost/proyecto_pana/public`.

## Uso local

Desde esta carpeta, instala las dependencias y después inicia el servidor Angular:

```powershell
npm install
npm start
```

El servidor de desarrollo se abrirá en `http://localhost:4200`. La API de salud es `/api/health`.
