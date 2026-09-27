# Arquitectura de funcionalidades

Cada carpeta de `features` es la frontera pública y la implementación completa de una
funcionalidad del producto. Las rutas solo importan componentes desde estas entradas
(`index.ts`), y no existe una segunda carpeta de funcionalidades paralela.

Dentro de cada funcionalidad, el código debe evolucionar hacia esta forma:

```text
feature/
  pages/       Componentes asociados a rutas
  components/  Componentes propios de la funcionalidad
  data-access/ Servicios HTTP, modelos y adaptadores
  state/       Fachadas y estado local cuando sea necesario
  index.ts     API pública de la funcionalidad
```

`core` contiene infraestructura transversal, `layout` contiene el shell autenticado y
`shared` contiene UI reutilizable sin reglas de negocio. Las funcionalidades no deben
importar entre sí sus implementaciones: si necesitan colaborar, deben hacerlo mediante
`core`, `shared` o una API pública.
