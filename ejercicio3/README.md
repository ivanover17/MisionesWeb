# 🛂 Pasaporte Gastronómico

Aplicación web hecha con **Vite + JavaScript vanilla (módulos ES)** que consume la API pública
[TheMealDB](https://www.themealdb.com/api.php) para viajar por el mundo plato a plato.

Eliges un país, la app trae sus recetas, calcula sus estadísticas y te "sella" el pasaporte.
Los sellos se guardan en el navegador para volver a cualquier destino con un clic.

## Funcionalidades

- **Selector de destino** con todos los países de TheMealDB, ordenados alfabéticamente.
- **Ficha del país**: número de platos, media de ingredientes por receta e *ingrediente estrella*
  (el más repetido), todo calculado con `reduce`.
- **Filtro por categoría** (chips con recuento) y **buscador** por nombre de plato o ingrediente.
- **Detalle de la receta** en un modal (`<dialog>`) con ingredientes, pasos, etiquetas y vídeo.
- **🎲 Sorpréndeme**: abre una receta aleatoria.
- **Sellos** de los últimos países visitados (`localStorage`).
- Estados de **carga** (olla con burbujas), **error** (con botón *Reintentar*) y **vacío** visibles.
- Modo claro/oscuro automático y diseño adaptable a móvil.

## Puesta en marcha

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
npm run preview  # sirve la build
```

### Abrir con doble clic (sin servidor)

`npm run build` genera en `dist/` tres archivos separados: `index.html`, `assets/app.js` y
`assets/style.css`. Ese `dist/index.html` se puede abrir con doble clic (`file://`) porque la build
une los módulos en un script clásico: los navegadores bloquean `<script type="module">` desde disco.
La configuración está en `vite.config.js`. La carpeta `dist/` se puede copiar a cualquier sitio.

El `index.html` de la raíz es el código fuente: se abre con `npm run dev` o con Live Server.

## Estructura

```
ejercicio3/
├── index.html              # Maquetación base y contenedores
├── vite.config.js          # Build abrible con doble clic (JS y CSS separados)
└── src/
    ├── main.js             # Controlador: estado, eventos y orquestación
    ├── api/mealdb.js       # fetch + async/await, timeout, response.ok, errores
    ├── logic/meals.js      # Transformación pura con map/filter/reduce
    ├── ui/render.js        # Pintado en el DOM (cargando, error, vacío, tarjetas, detalle)
    ├── storage/passport.js # Sellos en localStorage
    ├── assets/plate.svg    # Favicon e imagen de reserva
    └── style.css
```

Cada capa tiene una única responsabilidad: `api` no conoce el DOM, `logic` no hace peticiones
ni pinta, y `render` solo recibe datos ya limpios.

## Decisiones técnicas

### Asincronía
- Todas las peticiones usan `async/await` dentro de `try/catch` y comprueban `response.ok`.
- `AbortSignal.timeout` corta peticiones colgadas (8 s) y un `AbortController` cancela la
  petición anterior si el usuario cambia de país rápido, evitando que una respuesta vieja pise a la nueva.
- Las recetas de un país se piden **en paralelo** con `Promise.allSettled`: si alguna falla,
  se muestran las demás y se avisa de cuántas no se pudieron cargar.
- Los errores se traducen a mensajes comprensibles mediante una clase `ApiError`.

### Transformación de datos
- La API trae los ingredientes "aplanados" en `strIngredient1…20` / `strMeasure1…20`;
  se convierten en un array con `Array.from(...).map(...).filter(...)`.
- Categorías e ingrediente estrella se obtienen con `reduce` (tabla de frecuencias) + `sort`.
- Los filtros encadenan `filter` y `some`. No hay bucles `for` en el código.

### Robustez
- TheMealDB responde `{ meals: null }` cuando no hay resultados e incluso `{ meals: "Invalid ID" }`;
  `extractMeals` lo normaliza siempre a un array.
- Muchos países de la lista no tienen recetas: se muestra un estado vacío en lugar de romper.
- Campos `null`, cadenas vacías o con espacios se limpian y reciben valores por defecto.
- Solo se aceptan URLs `http(s)` (vídeo, fuente, imagen) y todo el texto se escapa antes de
  insertarlo en el DOM para evitar inyección de HTML.
- Las imágenes rotas se sustituyen por un plato vacío, y si `localStorage` no está disponible
  la app sigue funcionando sin sellos.

## Declaración de uso de IA

Este proyecto se ha desarrollado con ayuda de **Claude (Anthropic)** a través de Claude Code.
La IA se usó para generar la estructura inicial del proyecto, proponer la separación en módulos,
escribir buena parte del código y de los estilos, y redactar este README.
He revisado el código, lo he probado contra la API real (países sin recetas, IDs inválidos,
cancelación de peticiones) y entiendo y puedo explicar cada una de las partes.

## Créditos

Datos e imágenes: [TheMealDB](https://www.themealdb.com) (API pública gratuita, clave de pruebas `1`).
