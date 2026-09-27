# Arquitectura backend por funcionalidades

Cada dominio del producto vive en `Features/<feature>/` y conserva sus capas internas:

```text
Features/<feature>/
  Controllers/
  Services/
  Repositories/
  Validators/
```

Las rutas ensamblan cada feature y la infraestructura transversal permanece en
`Exceptions`, `Middleware` y `Support`. Los namespaces existentes se conservan para
evitar cambios de contrato; el autoload resuelve las clases en su nueva ubicación.

Una feature no debe consultar directamente otra implementación. La colaboración entre
dominios debe pasar por un servicio explícito o por la infraestructura compartida.
