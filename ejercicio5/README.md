# Cenas del Pasaporte 🍽️

Misión 4 (Full Contact Forms) de Web Development I. Sigue con mi **Pasaporte Gastronómico** (M2 y M3):
ahora el restaurante del pasaporte organiza **cenas temáticas**, cada noche de un país, y esta app sirve
para **reservar mesa** y **ver y cancelar las reservas**.

- Formulario de reserva con **React Hook Form** (no controlado) y validación con un esquema de **Zod**.
- Los países salen de **TheMealDB** (la misma API de las misiones anteriores) con `useQuery`.
- Las reservas se guardan en un **json-server** local y se gestionan con **TanStack Query v5**
  (`useQuery` para listar, `useMutation` para crear y cancelar, con invalidación).
- **Reto bonus:** las respuestas del API también se validan con Zod (`safeParse`), y en los datos de
  ejemplo hay una reserva corrupta a propósito para demostrar que se detecta.

## Cómo arrancarlo

Hace falta Node 20 o superior.

```bash
npm install
npm run dev
```

`npm run dev` arranca dos cosas a la vez (con `concurrently`):

| Qué | Dónde | Script |
| --- | --- | --- |
| La app (Vite) | http://localhost:5173 | `npm run web` |
| El API de reservas (json-server) | http://localhost:3001/reservas | `npm run api` |

El json-server responde con **600 ms de retraso** (`--delay 600`) para que se vean los estados de carga.

La base de datos es `server/db.json`, que **no se sube a Git** porque cambia cada vez que reservas o
cancelas. La primera vez se crea copiando `server/db.seed.json` (lo hace `server/prepare-db.js`).
Para volver a los datos de ejemplo: `npm run reset-db`.

Otros comandos: `npm run build`, `npm run preview` y `npm run lint` (oxlint con las reglas de hooks).

## Qué se puede hacer

- **Reservar**: nombre, email, país de la cena, fecha, turno (comida o cena), comensales, cuántos
  son niños, alergias (y cuál, si marcas «Otra»), comentario y aceptar las condiciones.
- **Ver las reservas** ordenadas por fecha y **filtrarlas por país**.
- **Cancelar** una reserva (pide confirmación).

Las reglas del restaurante que valida el formulario:

- Nombre de 2 a 60 caracteres, solo letras, espacios, guiones y apóstrofos.
- Email válido (se guarda sin espacios y en minúsculas).
- Fecha **a partir de mañana**, como mucho **a 90 días** y **nunca en lunes** (cerramos).
- **Los domingos solo hay turno de comida.**
- De 1 a 10 comensales, y **al menos un adulto** (niños < comensales).
- Si marcas la alergia «Otra», hay que decir cuál.
- Comentario de 300 caracteres como mucho (con contador).
- Hay que aceptar las condiciones.

## Cómo está organizado

```
server/
├── db.seed.json         -> datos de ejemplo (incluye la reserva corrupta del reto bonus)
└── prepare-db.js        -> crea server/db.json desde la semilla (o lo resetea)
src/
├── main.jsx             -> QueryClientProvider + <App />
├── App.jsx              -> cabecera y las dos columnas (formulario y lista)
├── styles.css           -> la paleta del Pasaporte
├── schemas/
│   └── reserva.js       -> TODA la validación: formulario y respuestas del API
├── lib/
│   └── fechas.js        -> hoy, sumar días, día de la semana, fecha legible
├── api/
│   ├── http.js          -> fetch + JSON con errores legibles
│   ├── reservas.js      -> GET / POST / DELETE de reservas (validando la respuesta)
│   └── mealdb.js        -> países de TheMealDB (validando la respuesta)
├── queries/
│   └── reservas.js      -> claves de las queries + useAreas, useReservas, useCrearReserva, useBorrarReserva
└── components/
    ├── ReservaForm.jsx  -> el formulario (React Hook Form + zodResolver)
    ├── Campo.jsx        -> etiqueta + control + ayuda + error, con aria-invalid / aria-describedby
    ├── ReservasList.jsx -> filtro, lista, cancelar y aviso de reservas descartadas
    └── Status.jsx       -> Cargando y MensajeError (con «Reintentar»)
```

Igual que en la M3, cada capa hace una cosa: `api/` no sabe de React, `schemas/` no sabe de React ni
de la red, `queries/` conecta la API con TanStack Query y los componentes solo pintan y llaman a hooks.

## Decisiones que he tomado

### React Hook Form

- **Formulario no controlado.** Todos los campos usan `register`, así que no hay un `useState` por campo
  ni se re-renderiza el formulario en cada tecla. Los números usan `valueAsNumber: true`, para que a Zod
  le llegue un número (o `NaN` si está vacío, que Zod rechaza con «¿Cuántos vais a ser?»).
- **`mode: 'onTouched'`**: no grito errores mientras escribes por primera vez; un campo se valida al
  salir de él, y a partir de ahí se revalida mientras lo corriges.
- **`deps`**: algunas reglas cruzan campos, así que al cambiar uno se revalida el otro (cambiar la
  fecha revalida el turno, cambiar los comensales revalida los niños, marcar alergias revalida el
  «¿Cuál?»).
- **`useWatch`** solo para lo que se pinta según el valor: el campo «¿Cuál?» aparece si marcas «Otra»,
  y el contador del comentario.
- **Errores accesibles**: cada error tiene `role="alert"` y su `id`; el input lleva
  `aria-invalid="true"` y `aria-describedby` apuntando al error (y a la ayuda si la hay). Al enviar con
  errores, React Hook Form pone el foco en el primer campo mal y arriba sale «Revisa los N campos
  marcados en rojo». El formulario lleva `noValidate` para que los mensajes sean los míos y no los
  del navegador.
- **Errores del servidor** con `setError('root.servidor', …)`: no son de un campo concreto, así que van
  a la raíz del formulario y se borran solos en el siguiente envío.

### Zod

- **Un único esquema, `datosReserva`**, describe cómo es una reserva. De él salen:
  - `reservaFormSchema`: lo que valida el formulario. Añade la casilla de condiciones y las reglas de la
    fecha (`fechaReservable`: futura, máx. 90 días, lunes no).
  - `reservaSchema`: una reserva tal como la devuelve el servidor (con `id` y `creadaEn`). No lleva las
    reglas de la fecha, porque una reserva guardada puede ser de ayer.
- **Mensajes propios en todo** (`{ error: '…' }` de Zod 4).
- **Transformaciones**: `trim()` en los textos y `toLowerCase()` en el email. Lo que recibe el
  `onSubmit` ya viene limpio.
- **Reglas cruzadas con `refine` + `when`.** Al principio las tenía todas en un `superRefine`, pero
  probando vi que si faltaba la casilla de condiciones, las reglas cruzadas no se ejecutaban (Zod no
  corre los refine del objeto si un campo ya ha fallado), y el usuario descubría los errores de uno en
  uno. Con `when`, cada regla se comprueba en cuanto *sus* campos son válidos.
- Conectado con `zodResolver(reservaFormSchema)`: React Hook Form no tiene ni una regla escrita a mano.

### TanStack Query

- **Las claves están en un solo sitio** (`claves` en `queries/reservas.js`):

  ```
  ['areas']                                -> países de TheMealDB
  ['reservas']                             -> raíz de todo lo de reservas
  ['reservas', 'lista', { area: '' }]      -> todas
  ['reservas', 'lista', { area: 'Thai' }]  -> filtradas por un país
  ```

  El filtro forma parte de la clave, así que cada filtro tiene su propia caché.
- **Invalidación**: al crear o cancelar una reserva invalido la raíz `['reservas']`. Como todas las
  listas empiezan así, se marcan como caducadas *todas* las variantes filtradas de una vez, y la que
  estás viendo se vuelve a pedir.
- El `onSuccess` de la mutación **devuelve** la promesa de `invalidateQueries`: así la mutación sigue
  «pendiente» hasta que la lista se ha recargado, y el botón no se reactiva antes de tiempo.
- `useAreas` tiene `staleTime: Infinity` (los países no cambian) y lo usan el formulario y el filtro:
  la segunda vez sale de la caché, sin otra petición.
- `useReservas` usa `placeholderData: keepPreviousData`: al cambiar el filtro se sigue viendo la lista
  anterior, atenuada, en lugar de un parpadeo a «Cargando…».
- Las `queryFn` reciben el `signal` de TanStack Query y se lo pasan a `fetch`, así una petición que ya
  no hace falta se cancela.
- Cada tarjeta de reserva tiene su propio `useBorrarReserva()`, así cada una sabe si es ella la que se
  está cancelando («Cancelando…»).

### Estados para el usuario

| Situación | Qué se ve |
| --- | --- |
| Cargando países | El desplegable desactivado con «Cargando países…» |
| Cargando reservas | Spinner «Cargando reservas…» |
| Refrescando | «Actualizando…» junto al título y la lista atenuada |
| Enviando | Botón desactivado «Reservando…» |
| Reserva creada | Mensaje verde con el resumen (en una región `aria-live`) y el formulario vacío |
| Error al guardar | Mensaje rojo con lo que ha dicho el servidor |
| Servidor caído | «No hay conexión con el servidor. ¿Está arrancado (npm run dev)?» + **Reintentar** |
| TheMealDB caído | Lo mismo, pero diciendo que el fallo es de TheMealDB |
| Lista vacía | «Todavía no hay reservas…» (o «…para la cena de Thai» si hay filtro) |

## ★ Reto bonus: validar la respuesta del API

No me fío de lo que llega de fuera:

- `getReservas` comprueba primero que la respuesta sea una lista y luego valida **cada reserva** con
  `reservaSchema.safeParse`. Las válidas se pintan; las que fallan van a `descartadas` con el motivo.
- `crearReserva` valida también lo que devuelve el POST.
- `getAreas` valida la respuesta de TheMealDB con `areasRespuestaSchema`.

**Cómo comprobarlo:** en `server/db.seed.json` la reserva 3 está mal a propósito (nombre vacío,
email «esto-no-es-un-email», fecha «mañana», comensales «muchos»). Al abrir la app no aparece en la
lista; en su lugar sale el aviso amarillo «1 reserva del servidor no cumple el esquema y se ha
descartado», y al desplegarlo se ve qué campos fallan. Si la borras o la editas a mano en
`server/db.json`, el aviso cambia. `npm run reset-db` la vuelve a poner.

## Uso de IA

He usado **Claude** (de Anthropic, modelo Claude Opus 5.5) en la app de Claude, el mismo asistente que en
la M2 y la M3.

Prompts reales:

> «dale compañero» (junto con el PDF del enunciado de la M4)

Me propuso seguir con el Pasaporte con un formulario de reservas y le contesté «mola».

**Qué hizo la IA:** la idea de llevar el Pasaporte a un formulario de reservas, todo el código (esquemas,
formulario, capa de datos, hooks de TanStack Query, componentes y estilos), el json-server con los
datos de ejemplo, los commits y el borrador de este README.

**Cómo se verificó:**
- `npm run lint` sin avisos y `npm run build` sin errores.
- Pruebas en el navegador (con un script de Playwright) con json-server arrancado:
  - enviar vacío: salen los 5 errores, el foco va a «Nombre» y aparece el resumen;
  - domingo + cena, 2 comensales y 2 niños, «Otra» sin detalle: salen las tres reglas cruzadas;
  - un lunes: «Los lunes el restaurante está cerrado» (hoy y más de 90 días los probé contra el
    esquema directamente, con `safeParse`);
  - una reserva correcta: botón «Reservando…», mensaje de éxito, formulario vacío y la reserva en la
    lista sin recargar;
  - filtrar por país (la lista anterior se ve atenuada mientras carga) y cancelar una reserva;
  - el aviso de la reserva corrupta;
  - el servidor respondiendo 500 al guardar, y el servidor apagado (mensaje + Reintentar);
  - en móvil (390 px), sin scroll horizontal.
- Durante esas pruebas salió un fallo real: con la casilla de condiciones sin marcar no se veían las
  reglas cruzadas. Se corrigió con `when` (ver «Decisiones» y la historia de commits).

**Qué escribí a mano:** en esta misión, nada de código. Lo mío es la app original del Pasaporte (M2 y
M3), darle el visto bueno a la idea y entender cada decisión para la defensa.

## Autopsia

### 1. Una reserva corrupta se descarta, no rompe la lista

`getReservas` valida reserva a reserva con `safeParse` y aparta las que fallan (con un aviso visible).

*Alternativa descartada:* `z.array(reservaSchema).parse(datos)`. Es una línea, pero basta **un** registro
mal para que falle toda la query y el usuario no vea ninguna reserva, aunque las otras 20 estén bien.

*Lo discutible:* estoy escondiendo datos. Si lo que falla es el esquema (por ejemplo, el servidor
empieza a mandar `comensales` como texto en todas), la lista saldría vacía con un aviso en vez de con un
error claro. Por eso el aviso dice cuántas se han descartado y por qué, y si lo que llega ni siquiera es
una lista, sí lanzo un error.

### 2. Después de crear o cancelar, invalido en vez de tocar la caché a mano

Al terminar la mutación hago `invalidateQueries({ queryKey: ['reservas'] })` y la lista se vuelve a
pedir al servidor.

*Alternativas descartadas:*
- `setQueryData` para meter la reserva nueva directamente en la caché. Me ahorra un GET, pero tendría
  que saber en qué listas filtradas debe aparecer y en qué posición (van ordenadas por fecha), es
  decir, repetir en el cliente la lógica del servidor.
- Una actualización optimista (pintarla antes de que responda el servidor). Queda más rápido, pero hay
  que deshacerla a mano si falla, y aquí lo importante es no confirmar una mesa que no se ha guardado.

*Lo discutible:* cada reserva cuesta una petición más (y con el retraso de 600 ms se nota). A cambio, lo
que ves es siempre lo que hay en el servidor.

## Créditos

Los países salen de [TheMealDB](https://www.themealdb.com). Las reservas de ejemplo son inventadas.
