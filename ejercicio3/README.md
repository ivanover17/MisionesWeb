# Pasaporte Gastronómico

Esta es mi práctica de consumir una API pública con fetch. Elegí [TheMealDB](https://www.themealdb.com/api.php),
que es una base de datos de recetas de todo el mundo, porque PokeAPI la iba a usar media clase y me
apetecía algo distinto.

La idea es que la página sea como un pasaporte: eliges un país, te enseña los platos típicos de allí
y te pone un "sello". Los sellos se quedan guardados, así que la próxima vez que entras puedes volver
a un país con un clic.

## Qué se puede hacer

- Elegir un país en el desplegable y ver sus platos.
- Ver unos datos del país: cuántos platos hay, cuántos ingredientes llevan de media y cuál es el
  ingrediente que más se repite (en España sale el chorizo, cómo no).
- Filtrar por categoría (Pork, Seafood, Dessert…) o buscar por nombre o por ingrediente.
- Pinchar en un plato para ver la receta entera: ingredientes, pasos y el vídeo de YouTube si lo tiene.
- El botón 🎲 *Sorpréndeme* te saca una receta al azar.
- Mientras carga sale una olla con burbujas, y si falla algo sale un mensaje con un botón para reintentar.

## Cómo arrancarlo

Hace falta tener Node instalado (yo uso la versión 24, con la 20 o más debería ir).

```bash
npm install
npm run dev
```

y luego abrir http://localhost:5173 en el navegador.

**Ojo:** si abres el `index.html` de la carpeta con doble clic no funciona, se queda en "Cargando
países…". Es porque el navegador no deja cargar módulos de JavaScript desde un archivo del disco
(da un error de CORS en la consola). Para eso hay dos opciones:

- Usar `npm run dev` o la extensión Live Server de VS Code.
- Hacer `npm run build`. Eso crea la carpeta `dist/` con un `index.html`, un `javascriptMision2.js`
  y un `estiloMision2.css`, y esa sí se abre con doble clic. Para que funcione cambié la
  configuración en `vite.config.js` para que junte todos los módulos en un solo archivo JS normal,
  y lo dejé sin minificar para que se pueda leer.

## Cómo está organizado

```
ejercicio3/
├── index.html
├── vite.config.js
└── src/
    ├── main.js              -> une todo: guarda el estado y escucha los clics
    ├── api/mealdb.js        -> las llamadas a la API
    ├── logic/meals.js       -> limpia los datos y calcula las estadísticas
    ├── ui/render.js         -> pinta las cosas en la página
    ├── storage/passport.js  -> guarda los sellos en localStorage
    ├── assets/plate.svg     -> el icono
    └── style.css
```

La idea es que cada archivo haga una sola cosa. El de la API no toca el HTML, el de la lógica no hace
fetch ni pinta nada, y el de render recibe los datos ya limpios y solo se encarga de mostrarlos.

## Cosas que me han parecido interesantes

**Lo asíncrono.** Todas las peticiones van con `async/await` y `try/catch`, y se mira `response.ok`
porque fetch no da error con un 404 o un 500, solo cuando no hay conexión. También hay un timeout de
8 segundos para que no se quede cargando para siempre. Otra cosa: si cambias de país muy rápido, la
petición anterior se cancela con un `AbortController`, porque si no a veces llegaba tarde la respuesta
del país viejo y te pintaba los platos que no eran.

Las recetas de cada país se piden todas a la vez con `Promise.allSettled` (hasta 16). Usé `allSettled`
en vez de `Promise.all` porque así, si falla alguna, se enseñan las demás y sale un aviso de cuántas no
cargaron, en vez de fallar todo.

**Transformar los datos.** La API tiene una forma un poco rara de dar los ingredientes: en vez de una
lista, vienen en 20 campos sueltos (`strIngredient1`, `strIngredient2`… hasta 20), y los que no se usan
vienen vacíos o con un espacio. Los convierto en un array con `Array.from` + `map` + `filter`. Las
estadísticas del país se sacan con `reduce`, y el buscador usa `filter` y `some`. No he usado ningún
bucle `for`.

**Que no explote.** Mientras probaba me encontré con varias cosas raras de la API:

- Cuando no hay resultados devuelve `{ meals: null }` en vez de un array vacío.
- Si buscas una receta con un ID que no existe devuelve `{ meals: "Invalid ID" }`, un texto.
- Hay casi 200 países en la lista, pero la mayoría no tiene ninguna receta.

Todo eso se controla y sale un mensaje en vez de romperse. Además, el texto que viene de la API se
escapa antes de meterlo en el HTML, los enlaces solo se aceptan si empiezan por http/https, y si una
foto no carga se pone un plato vacío en su lugar.

## Uso de IA

He usado Claude (de Anthropic), a través de Claude Code, para hacer este proyecto. Me ayudó a crear el
proyecto con Vite, a decidir cómo separar los módulos y a escribir gran parte del código, los estilos y
este README. También me ayudó a resolver por qué la página no cargaba al abrirla con doble clic.
Yo he revisado el resultado y lo he probado en el navegador.

## Créditos

Los datos y las fotos son de [TheMealDB](https://www.themealdb.com), que tiene una API gratis
para pruebas.
