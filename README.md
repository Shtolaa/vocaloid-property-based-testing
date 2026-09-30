# Catálogo Vocaloid — Property-Based Testing

Laboratorio de gestión de **canciones Vocaloid**, implementado en JavaScript con CRUD en memoria y pruebas basadas en propiedades mediante **fast-check**. No requiere interfaz gráfica, servidor ni base de datos.

## Requisitos y ejecución

- Node.js 22 o superior y npm.
- Desde la raíz del repositorio:

```sh
npm ci
npm test
npm run test:coverage
npm run demo
```

`npm ci` instala las versiones exactas del lockfile. Las pruebas usan `node:test` y `node:assert/strict`, incluidos en Node.js; fast-check es una dependencia de desarrollo.

## Dominio y reglas

La entidad principal es una canción con los siguientes campos:

| Campo | Regla |
| --- | --- |
| `id` | Entero positivo seguro, generado por el catálogo; no editable. |
| `title` | Título no vacío ni compuesto únicamente de espacios. |
| `vocaloid` | Nombre de la voz/cantante, por ejemplo Hatsune Miku o 初音ミク. |
| `producer` | Nombre del productor/compositor, por ejemplo ryo. |
| `durationSeconds` | Entero entre 1 y 3600 segundos, ambos incluidos. |

Los tres textos tienen hasta 100 unidades UTF-16 (la medida `string.length` de JavaScript). Se permite Unicode y se preserva el texto original, incluidos los espacios en los extremos. No se limita el catálogo a nombres predefinidos. El máximo de duración es una decisión de este laboratorio, no una restricción del software Vocaloid.

Se permiten canciones con datos iguales: cada registro tiene identidad propia. Los IDs no se reutilizan tras eliminar. Solo se admiten los campos indicados; campos desconocidos y el ID en datos de creación/actualización generan `TypeError`.

## API

```js
import { SongCatalog } from './src/song-catalog.js';

const catalog = new SongCatalog();
const song = catalog.create({
  title: 'World is Mine',
  vocaloid: 'Hatsune Miku',
  producer: 'ryo',
  durationSeconds: 255,
});

catalog.get(song.id);                    // Canción o null si no existe.
catalog.list();                          // Todas, en orden de creación.
catalog.update(song.id, { title: 'ワールドイズマイン' });
catalog.delete(song.id);                 // true si eliminó; false si no existía.
```

- `create(data)`: exige los cuatro campos del dominio y devuelve la canción con su ID.
- `get(id)` y `list()`: devuelven copias; modificar el resultado no modifica el catálogo.
- `update(id, patch)`: actualización parcial; conserva los campos omitidos y el ID. Devuelve una copia o `null` si no existe. Un parche vacío `{}` es válido y no cambia los datos.
- `delete(id)`: elimina únicamente esa canción. Repetir la eliminación devuelve `false` y no modifica el estado.
- Los IDs inválidos generan `TypeError`. `update` valida el ID y el parche antes de buscar el registro, por lo que un parche inválido genera error incluso con un ID inexistente.
- Una creación o actualización rechazada no modifica el estado. La creación rechazada tampoco consume un ID.

El estado es privado (`Map` y campos privados de clase). Como los campos del dominio son primitivos, las copias superficiales son suficientes. El catálogo no persiste entre ejecuciones: cada instancia comienza vacía. No es un servicio concurrente ni una base de datos.

## Investigación: ¿qué es Property-Based Testing?

Una prueba por ejemplos comprueba una entrada específica. Una prueba basada en propiedades expresa una regla general que debe cumplirse para muchos datos generados automáticamente.

fast-check permite definir:

1. **Generadores (`Arbitrary`)**: `fc.string`, `fc.integer`, `fc.record`, `fc.array`, etc.
2. **Propiedades**: `fc.property(generadores, predicado)` describe el comportamiento esperado.
3. **Ejecución**: `fc.assert` ejecuta la propiedad varias veces y falla cuando encuentra un contraejemplo.
4. **Shrinking**: reduce el contraejemplo para facilitar el diagnóstico.
5. **Reproducción**: reporta `seed` y `path` para volver a ejecutar la misma falla.

En estas pruebas se ejecutan **300 casos por propiedad**, con una instancia nueva del catálogo en cada caso. Las listas tienen tamaño acotado para mantener las pruebas rápidas. Los generadores cubren textos ASCII y Unicode, duraciones válidas, listas vacías y no vacías, parches parciales y datos inválidos. Ningún servicio externo ni mock reemplaza al sistema bajo prueba.

### Propiedades implementadas

| Operación | Invariante principal | Archivo |
| --- | --- | --- |
| Create | Crear preserva todos los datos y asigna IDs positivos únicos, incluso con canciones duplicadas. | `test/create.test.js` |
| Read | Leer por ID y listar recupera exactamente los registros creados, sin cambiar el estado. | `test/read.test.js` |
| Update | Actualizar aplica solo los campos enviados, preserva identidad y cantidad, y no cambia otras canciones. | `test/update.test.js` |
| Delete | Eliminar hace desaparecer solo el registro elegido; repetir no produce cambios adicionales y los IDs no se reutilizan. | `test/delete.test.js` |

Propiedades adicionales: aislamiento de entradas/resultados, ausencia de cambios ante IDs inexistentes, rechazo atómico de datos inválidos, prohibición de editar IDs y validación de los IDs recibidos.

Hay **10 pruebas basadas en propiedades** y **1 prueba por ejemplos** para los límites de duración y textos japoneses. La prueba por ejemplos complementa a las propiedades, no sustituye ninguna operación CRUD.

### Ejemplo de propiedad

```js
fc.assert(fc.property(songArbitrary, (data) => {
  const catalog = new SongCatalog();
  const created = catalog.create(data);
  assert.deepEqual(catalog.get(created.id), created);
}), { numRuns: 300 });
```

Los datos cambian automáticamente, pero la regla «leer lo creado devuelve sus datos e identidad» permanece igual.

### Reproducir un fallo

Para reproducir un contraejemplo, usa el `seed` y `path` reportados por fast-check y ejecuta **solo la prueba que falló**. Por ejemplo, en PowerShell:

```powershell
$env:FC_SEED = '12345'
$env:FC_PATH = '0:1:2'
node --test --test-name-pattern='Create:' test/create.test.js
Remove-Item Env:FC_SEED
Remove-Item Env:FC_PATH
```

O en Bash:

```sh
FC_SEED=12345 FC_PATH='0:1:2' node --test --test-name-pattern='Create:' test/create.test.js
```

Esos valores son ilustrativos: reemplázalos por los del fallo real. Para repetir una corrida con semilla fija sin un contraejemplo, establece solamente `FC_SEED`.

## Estructura

```text
src/song-catalog.js      Implementación y validación del dominio.
test/helpers.js         Generadores y configuración de fast-check.
test/create.test.js     Propiedad de creación.
test/read.test.js       Propiedades de lectura y aislamiento.
test/update.test.js     Propiedades de actualización parcial.
test/delete.test.js     Propiedades de eliminación.
test/validation.test.js Validaciones y límites del dominio.
examples/demo.js        Demostración completa del CRUD.
package.json            Dependencias y comandos.
package-lock.json       Versiones exactas de dependencias.
```

## Alcance de la verificación

Las propiedades CRUD fueron escritas y ejecutadas antes de implementar los métodos correspondientes (ciclo RED → GREEN). Las pruebas de validación detectaron entradas inválidas aceptadas antes de añadir las reglas del dominio. `npm run test:coverage` permite inspeccionar cobertura; una cobertura alta no demuestra corrección absoluta. Las propiedades exploran datos dentro de los rangos definidos, no todas las entradas posibles.

## Referencias

- [Documentación oficial de fast-check](https://fast-check.dev/).
- [Getting Started: propiedades, generadores y shrinking](https://fast-check.dev/docs/introduction/getting-started/).
- [Runners: assert y check](https://fast-check.dev/docs/core-blocks/runners/).
- [Node.js: test runner](https://nodejs.org/api/test.html).

## Entregable Git

Repositorio público: [Shtolaa/vocaloid-property-based-testing](https://github.com/Shtolaa/vocaloid-property-based-testing).

Incluye código, pruebas, documentación y lockfile. `node_modules` queda excluido. La rama principal de entrega es `main`; `develop` conserva la rama de desarrollo.
