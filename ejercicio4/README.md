# Pasaporte Gastronómico · versión React

Misión 3 (Reactor Core) de Web Development I. Es mi app de la M2, el **Pasaporte Gastronómico**,
reconstruida en **React 19** con componentes, props, estado, efectos y custom hooks.

La idea sigue siendo la misma: eliges un país, ves sus platos típicos (sacados de
[TheMealDB](https://www.themealdb.com/api.php)) y te llevas su sello. La diferencia es que antes
el JavaScript pintaba el HTML a mano con `innerHTML` y ahora la interfaz se calcula a partir del
estado: cambio el estado y React repinta lo que haga falta.

## Qué se puede hacer

- Elegir un país en el desplegable (o pulsar uno de tus sellos) y ver sus platos con estadísticas:
  número de platos, ingredientes de media y el ingrediente estrella.
- Filtrar por categoría con las chips, o escribir para filtrar por nombre o ingrediente.
- Sin país elegido, el buscador busca recetas en todo el mundo (con espera de 400 ms para no lanzar
  una petición por tecla).
- Abrir la receta completa en una ventana modal (ingredientes, pasos, vídeo).
- 🎲 **Sorpréndeme**: receta al azar, y dentro de la modal «Otra al azar» para ir pasando.
- Los sellos se guardan en `localStorage` y solo se ponen si el país tiene recetas de verdad.
- **Nuevo: cesta de la compra** (lo explico abajo).

### Lo nuevo: la cesta de la compra 🧺

Desde cualquier receta puedes pulsar «Añadir a la cesta». La cesta junta los ingredientes de todas
las recetas que añadas y **los agrupa**: si la paella y el gazpacho llevan ajo, sale una sola línea
«Garlic» con las dos cantidades y de qué receta es cada una. Puedes tachar lo que ya tienes (se tacha
en todas las recetas a la vez), quitar una receta entera, borrar lo comprado y copiar la lista al
portapapeles para pasártela al móvil. Las tarjetas de los platos que están en la cesta llevan un 🧺.

La cesta también se guarda en `localStorage`, y si tienes la app abierta en dos pestañas, lo que
marcas en una aparece en la otra (escucho el evento `storage`).

## Cómo arrancarlo

Hace falta Node 20 o superior.

```bash
npm install
npm run dev
```

Y abrir http://localhost:5173. Otros comandos: `npm run build` (genera `dist/`), `npm run preview`
(sirve lo generado) y `npm run lint` (pasa oxlint con las reglas de hooks, incluida
`exhaustive-deps` para las dependencias de los efectos).

## Cómo está organizado

```
src/
├── main.jsx                 -> monta <App /> en StrictMode
├── App.jsx                  -> estado compartido y composición de la página
├── styles.css               -> los estilos de la M2 + la cesta
├── api/
│   ├── mealdb.js            -> fetch a TheMealDB (timeout, errores, AbortSignal). Igual que en la M2
│   └── recipes.js           -> junta API + lógica y devuelve datos limpios
├── logic/
│   ├── meals.js             -> funciones puras: normalizar, estadísticas, filtros. Igual que en la M2
│   └── basket.js            -> funciones puras de la cesta (agrupar, marcar, texto para copiar)
├── hooks/
│   ├── useAsync.js          -> custom hook genérico para cargar datos (el "useFetch")
│   ├── useLocalStorage.js   -> useState que se guarda en localStorage y se sincroniza entre pestañas
│   ├── useDebouncedValue.js -> retrasa un valor (para el buscador)
│   ├── useRecipes.js        -> useAreas, useAreaMeals, useRecipeSearch, useRandomMeal
│   ├── useStamps.js         -> los sellos
│   └── useBasket.js         -> la cesta
└── components/
    ├── Header.jsx, AreaSelect.jsx
    ├── StampList.jsx
    ├── ResultsSection.jsx, CountryHeader.jsx, CategoryChips.jsx, MealGrid.jsx, MealCard.jsx
    ├── Modal.jsx, MealDetail.jsx, RandomMeal.jsx
    ├── ShoppingBasket.jsx
    ├── SafeImage.jsx
    └── Status.jsx           -> Loading, ErrorMessage y EmptyState
```

La regla es la misma que en la M2: cada archivo hace una cosa. `api/` no sabe de React, `logic/` no
hace fetch ni sabe de React (son funciones puras), los hooks conectan las dos cosas con el estado y
los componentes solo reciben props y pintan.

## Decisiones que he tomado

**Qué estado hay y dónde vive.** `App` solo guarda lo que necesitan varios componentes a la vez
(*lifting state up*): el país elegido (`area`), el texto del buscador (`query`) y qué receta está
abierta en la modal (`detail`). Los sellos y la cesta están en sus hooks. Todo lo demás se
**deriva** en cada render en vez de guardarse: el nombre del país, si estoy en modo país o modo
búsqueda, las estadísticas, los platos filtrados, las categorías, los ids de la cesta, cuántos
ingredientes faltan por comprar…

- La receta abierta se guarda por **id** (`{ type: 'meal', id }`) y no como objeto copiado: el
  objeto se busca en los platos ya cargados. Así no hay dos copias que se puedan desincronizar y
  tampoco hace falta volver a pedirla a la API.
- La categoría elegida es **estado local** de `ResultsSection`, porque nadie más la usa. App monta
  ese componente con `key={area || 'search:' + término}`: al cambiar de país, React lo crea de
  nuevo y la categoría vuelve sola a «Todo», sin resetearla a mano.
- Cambiar de país es un evento, así que el reset del buscador va en `handleAreaChange`, no en un
  `useEffect` que vigile `area`.

**Efectos: solo para sincronizar con cosas de fuera de React.** Hay seis `useEffect` y todos
hablan con algo externo:

| Dónde | Con qué sincroniza | Dependencias | Cleanup |
| --- | --- | --- | --- |
| `useAsync` | la red (fetch) | `[asyncFn, attempt]` | `controller.abort()` |
| `useLocalStorage` (1) | escribir en localStorage | `[key, value]` | no hace falta |
| `useLocalStorage` (2) | evento `storage` de otras pestañas | `[key, initialValue, isValid]` | `removeEventListener` |
| `useDebouncedValue` | un temporizador | `[value, delay]` | `clearTimeout` |
| `Modal` | `<dialog>` nativo (`showModal()` / `close()`) | `[open]` | no hace falta |
| `ShoppingBasket` | temporizador que quita el «¡Copiada!» | `[copied]` | `clearTimeout` |

El cleanup de `useAsync` sustituye a los `AbortController` sueltos que tenía en la M2: si cambias de
país rápido, la petición vieja se cancela y no te pinta los platos que no son. También significa que
al cerrar la modal se cancela la receta al azar, porque su contenido se desmonta.

**Listas y keys.** Todas las keys salen de los datos y no del índice: el `id` de la receta, el
`area` del país, el nombre de la categoría, el número de hueco del ingrediente en la API (`slot`,
del 1 al 20, por si un ingrediente sale dos veces), el número de paso y el ingrediente en minúsculas
en la cesta.

**Imágenes rotas.** En la M2 añadía un listener `error` a cada `<img>` después de pintarlas. Ahora
`SafeImage` guarda en el estado la URL que ha fallado y, si coincide con la actual, enseña el plato
vacío.

## Uso de IA

He usado **Claude** (de Anthropic, modelo Claude Opus 5.5) en la app de Claude, el mismo asistente
que en la M2. Le pasé el enunciado de la M3 y un `.zip` con mi proyecto de la M2 y le pedí que lo
reconstruyera en React y me explicara cada decisión para la defensa.

Prompts reales que usé:

> «M3 · Reactor Core. Reconstruye (o reinventa) tu app de la misión anterior en React 19:
> componentes, props, estado y efectos. […]» (le pegué el enunciado entero con la rúbrica)

Y, cuando me preguntó cómo quería trabajar, elegí la opción *«Hazlo tú y explícamelo: proyecto
completo con README, y te explico cada decisión para la defensa»*, pasándole el código de la M2.

**Qué hizo la IA:** el reparto en componentes y hooks, el código de React, la cesta de la compra,
los estilos nuevos y el borrador de este README. Las capas `api/mealdb.js` y `logic/meals.js` vienen
de mi M2 con cambios pequeños (el `slot` de cada ingrediente, los pasos numerados y quitar tags
repetidas).

**Cómo lo verifiqué:**
- `npm run lint` sin avisos (con `react/exhaustive-deps` activada) y `npm run build` sin errores.
- Pruebas en el navegador: elegir país, filtrar por categoría y por texto, abrir recetas, cerrar la
  modal con Escape, con la ✕ y pinchando fuera, receta al azar y «Otra al azar», un país sin recetas
  (no da sello), la búsqueda global, añadir dos recetas con ajo a la cesta y comprobar que salen en
  una sola línea, recargar la página y ver que sellos y cesta siguen ahí.
- Cambiar de país muy rápido para comprobar que no se mezclan los platos (la petición vieja se
  cancela).

**Qué es mío:** la app original de la M2 (la idea del pasaporte, la API elegida y la capa de datos
que se reutiliza aquí) y la decisión de cómo trabajar. En esta misión no he escrito código a mano:
la IA generó el código, hizo las pruebas de arriba y también subió el repositorio y la entrega.
Lo que me toca a mí es entenderlo para defenderlo, y para eso le pedí que me explicara cada
decisión (las de este README).

## Autopsia

**1. `useAsync` no tiene un estado `status` que se ponga a `'loading'` dentro del efecto.**
Guardo el resultado junto con la petición que lo produjo (`{ asyncFn, attempt, data, error }`) y en
cada render compruebo si coincide con la petición actual. Si no coincide, *se deriva* que está
cargando.
*Alternativa descartada:* tres `useState` (`status`, `data`, `error`) y hacer `setStatus('loading')`
al principio del efecto. Es lo más habitual, pero provoca un render extra, durante un instante se ve
el dato del país anterior y es justo el tipo de estado duplicado que la rúbrica pide evitar. Tampoco
usé una librería tipo TanStack Query porque la misión es entender los efectos, no esconderlos.
*Lo discutible:* es menos obvio de leer, y obliga a que la función que se pasa sea estable (por eso
uso `useCallback` en `useRecipes.js`; si no, se pediría en cada render).

**2. El sello se pone dentro de la función de carga del país, cuando la petición termina bien.**
`useAreaMeals` recibe `onVisit` y lo llama solo si la respuesta no se ha cancelado y hay al menos una
receta.
*Alternativas descartadas:*
- Ponerlo en `handleAreaChange`, al elegir el país. Es lo más sencillo, pero de los casi 200 países
  de la API la mayoría no tienen recetas y el pasaporte se llenaría de sellos vacíos.
- Un `useEffect` que vigile `areaRequest.status === 'success'` y llame a `addStamp`. Funciona, pero
  sería un efecto que sincroniza estado con estado (una cadena de renders), justo lo que React
  recomienda no hacer.

*Lo discutible:* la función de carga ya no es «pura»: además de devolver datos tiene un efecto
secundario. Lo dejo así porque ocurre exactamente cuando pasa lo que quiero detectar (la carga ha ido
bien) y `addStamp` usa la forma funcional `setStamps(prev => …)`, así que es estable y no hace que la
petición se repita.

## Créditos

Los datos y las fotos son de [TheMealDB](https://www.themealdb.com), que tiene una API gratis para
pruebas.
