// Pasaporte Gastronómico - javascriptMision2.js
// Todo el JavaScript de la app en un solo archivo, separado por secciones.

// ==========================================================
// API: llamadas a TheMealDB
// ==========================================================

/**
 * Capa de acceso a TheMealDB.
 * Solo sabe hablar HTTP: pide, valida la respuesta y devuelve JSON crudo.
 * No transforma datos ni toca el DOM.
 */

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const TIMEOUT_MS = 8000;

/** Error propio para distinguir fallos de la API de bugs del código. */
class ApiError extends Error {
  constructor(message, { status = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * fetch + timeout + comprobación de response.ok + parseo seguro del JSON.
 * Acepta un AbortSignal externo para poder cancelar peticiones obsoletas.
 */
async function fetchJSON(path, { signal } = {}) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { signal: combined });
  } catch (error) {
    // Cancelación voluntaria: se propaga tal cual para que el llamador la ignore.
    if (signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new ApiError('La cocina tarda demasiado en responder (timeout).', { cause: error });
    }
    throw new ApiError('No hay conexión con la cocina. ¿Estás sin internet?', { cause: error });
  }

  if (!response.ok) {
    throw new ApiError(`La API respondió con un error ${response.status}.`, {
      status: response.status,
    });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError('La API devolvió algo que no es JSON válido.', { cause: error });
  }
}

/**
 * TheMealDB devuelve { meals: [...] }, { meals: null } si no hay resultados
 * e incluso { meals: "Invalid ID" }. Aquí lo reducimos siempre a un array.
 */
function extractMeals(data) {
  return Array.isArray(data?.meals) ? data.meals : [];
}

async function getAreas(options) {
  return extractMeals(await fetchJSON('/list.php?a=list', options));
}

async function getMealsByArea(area, options) {
  return extractMeals(await fetchJSON(`/filter.php?a=${encodeURIComponent(area)}`, options));
}

async function getMealById(id, options) {
  const [meal] = extractMeals(await fetchJSON(`/lookup.php?i=${encodeURIComponent(id)}`, options));
  return meal ?? null;
}

async function getRandomMeal(options) {
  const [meal] = extractMeals(await fetchJSON('/random.php', options));
  return meal ?? null;
}

// ==========================================================
// LÓGICA: limpiar datos y estadísticas
// ==========================================================

/**
 * Lógica pura: convierte los datos crudos de TheMealDB en objetos limpios
 * y calcula estadísticas. Sin fetch y sin DOM, así que es fácil de probar.
 */

const MAX_INGREDIENTS = 20;
// Plato vacío en línea (data URI): no depende de rutas, así funciona con Vite, Live Server o file://.
const FALLBACK_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
    '<rect width="120" height="120" fill="#f3e9d6"/>' +
    '<circle cx="60" cy="60" r="38" fill="#fffaf0" stroke="#c0492b" stroke-width="4"/>' +
    '<circle cx="60" cy="60" r="24" fill="none" stroke="#e2d3b5" stroke-width="3"/></svg>',
)}`;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

const safeUrl = (value) => {
  const url = clean(value);
  return /^https?:\/\//i.test(url) ? url : '';
};

/** Lista de países: quita entradas vacías y duplicadas y ordena alfabéticamente. */
function normalizeAreas(rawAreas) {
  const areas = rawAreas
    .map((raw) => ({ area: clean(raw?.strArea), country: clean(raw?.strCountry) }))
    .filter(({ area }) => area && area.toLowerCase() !== 'unknown')
    .map(({ area, country }) => ({ area, country: country || area }));

  const unique = new Map(areas.map((item) => [item.area, item]));
  return [...unique.values()].sort((a, b) => a.country.localeCompare(b.country, 'es'));
}

/** Resumen de plato (lo que devuelve filter.php). Descarta los que no tienen id o nombre. */
function normalizeMealSummaries(rawMeals) {
  return rawMeals
    .filter((raw) => clean(raw?.idMeal) && clean(raw?.strMeal))
    .map((raw) => ({
      id: clean(raw.idMeal),
      name: clean(raw.strMeal),
      image: safeUrl(raw.strMealThumb) || FALLBACK_IMAGE,
    }));
}

/**
 * Los ingredientes vienen "aplanados" en strIngredient1..20 y strMeasure1..20,
 * con huecos rellenos de "" o " ". Los convertimos en un array real.
 */
function extractIngredients(raw) {
  return Array.from({ length: MAX_INGREDIENTS }, (_, i) => ({
    name: clean(raw?.[`strIngredient${i + 1}`]),
    measure: clean(raw?.[`strMeasure${i + 1}`]),
  })).filter(({ name }) => name);
}

/** Plato completo (lookup.php / random.php) listo para pintar. */
function normalizeMeal(raw) {
  if (!raw || !clean(raw.idMeal)) return null;

  const steps = clean(raw.strInstructions)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^step\s*\d+$/i.test(line));

  return {
    id: clean(raw.idMeal),
    name: clean(raw.strMeal) || 'Plato sin nombre',
    category: clean(raw.strCategory) || 'Sin categoría',
    area: clean(raw.strArea) || 'Desconocido',
    country: clean(raw.strCountry) || clean(raw.strArea) || 'Desconocido',
    image: safeUrl(raw.strMealThumb) || FALLBACK_IMAGE,
    tags: clean(raw.strTags).split(',').map((t) => t.trim()).filter(Boolean),
    ingredients: extractIngredients(raw),
    steps,
    youtube: safeUrl(raw.strYoutube),
    source: safeUrl(raw.strSource),
  };
}

/** Cuenta cuántas veces aparece cada valor y devuelve [valor, n] ordenado de mayor a menor. */
function rank(values) {
  const counts = values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort(([, a], [, b]) => b - a);
}

/** Estadísticas del "sello" de un país a partir de los platos completos. */
function buildCountryStats(meals) {
  if (meals.length === 0) {
    return { total: 0, categories: [], topIngredient: null, avgIngredients: 0 };
  }

  const totalIngredients = meals.reduce((sum, meal) => sum + meal.ingredients.length, 0);
  const [topIngredient = null] = rank(
    meals.flatMap((meal) => meal.ingredients.map(({ name }) => name.toLowerCase())),
  );

  return {
    total: meals.length,
    categories: rank(meals.map((meal) => meal.category)),
    topIngredient: topIngredient && { name: topIngredient[0], count: topIngredient[1] },
    avgIngredients: Math.round((totalIngredients / meals.length) * 10) / 10,
  };
}

/** Filtros del usuario: texto (nombre o ingrediente) + categoría. */
function filterMeals(meals, { query = '', category = 'all' } = {}) {
  const needle = query.trim().toLowerCase();

  return meals
    .filter((meal) => category === 'all' || meal.category === category)
    .filter(
      (meal) =>
        !needle ||
        meal.name.toLowerCase().includes(needle) ||
        meal.ingredients.some(({ name }) => name.toLowerCase().includes(needle)),
    );
}

// ==========================================================
// SELLOS: guardar en localStorage
// ==========================================================

/**
 * Sellos del pasaporte: países ya visitados, guardados en localStorage.
 * Si el navegador bloquea el almacenamiento la app sigue funcionando sin sellos.
 */

const KEY = 'pasaporte-gastronomico:sellos';
const MAX_STAMPS = 12;

function loadStamps() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s?.area === 'string') : [];
  } catch {
    return [];
  }
}

function addStamp(stamps, { area, country }) {
  const next = [{ area, country }, ...stamps.filter((s) => s.area !== area)].slice(0, MAX_STAMPS);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento: los sellos solo duran esta sesión.
  }
  return next;
}

// ==========================================================
// RENDER: pintar en la página
// ==========================================================

/**
 * Capa de presentación: recibe datos ya transformados y los pinta.
 * Todo texto que viene de la API pasa por escapeHTML antes de entrar en el DOM.
 */

const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/** Iniciales para el sello: "United Kingdom" -> "UK", "Spain" -> "SP". */
const initials = (text) => {
  const words = text.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => w[0]).join('') : text.slice(0, 2))
    .slice(0, 3)
    .toUpperCase();
};


/** TheMealDB sirve miniaturas añadiendo /preview a la URL de la imagen. */
const thumbnail = (url) => (url === FALLBACK_IMAGE ? url : `${url}/preview`);

/** Si una imagen falla (404, sin red…) se cambia por el plato vacío. */
function useImageFallback(container) {
  container.querySelectorAll('img').forEach((img) =>
    img.addEventListener('error', () => (img.src = FALLBACK_IMAGE), { once: true }),
  );
}

/* ---------- Estados genéricos ---------- */

function renderLoading(container, message = 'Preparando los fogones…') {
  container.innerHTML = `
    <div class="status status--loading" role="status" aria-live="polite">
      <div class="pot" aria-hidden="true"><span></span><span></span><span></span></div>
      <p>${escapeHTML(message)}</p>
    </div>`;
}

function renderError(container, message, onRetry) {
  container.innerHTML = `
    <div class="status status--error" role="alert">
      <p class="status__icon" aria-hidden="true">🔥</p>
      <p><strong>Se nos ha quemado la receta.</strong></p>
      <p>${escapeHTML(message)}</p>
      ${onRetry ? '<button type="button" class="btn" data-retry>Reintentar</button>' : ''}
    </div>`;
  container.querySelector('[data-retry]')?.addEventListener('click', onRetry, { once: true });
}

function renderEmpty(container, message) {
  container.innerHTML = `
    <div class="status status--empty">
      <p class="status__icon" aria-hidden="true">🍽️</p>
      <p>${escapeHTML(message)}</p>
    </div>`;
}

/* ---------- Selector de países ---------- */

function renderAreaOptions(select, areas) {
  select.innerHTML = [
    '<option value="">Elige un destino…</option>',
    ...areas.map(
      ({ area, country }) =>
        `<option value="${escapeHTML(area)}">${escapeHTML(country)} · ${escapeHTML(area)}</option>`,
    ),
  ].join('');
  select.disabled = areas.length === 0;
}

/* ---------- Sellos visitados ---------- */

function renderStamps(container, stamps) {
  container.innerHTML = stamps.length
    ? stamps
        .map(
          ({ area, country }, i) => `
          <button type="button" class="stamp" data-area="${escapeHTML(area)}"
                  style="--tilt:${((i * 37) % 17) - 8}deg" title="Volver a ${escapeHTML(country)}">
            <span class="stamp__code">${escapeHTML(initials(country))}</span>
            <span class="stamp__name">${escapeHTML(country)}</span>
          </button>`,
        )
        .join('')
    : '<p class="stamps__empty">Aún no tienes sellos. ¡Elige tu primer destino!</p>';
}

/* ---------- Cabecera del país + estadísticas ---------- */

function renderCountryHeader(container, { country, stats, totalAvailable, failed }) {
  if (!country) {
    container.innerHTML = '';
    return;
  }

  const notes = [
    totalAvailable > stats.total + failed &&
      `Mostrando ${stats.total + failed} de ${totalAvailable} platos.`,
    failed > 0 && `${failed} receta(s) no se pudieron cargar.`,
  ].filter(Boolean);

  container.innerHTML = `
    <div class="country">
      <div class="country__seal" aria-hidden="true">${escapeHTML(initials(country))}</div>
      <div>
        <h2 class="country__title">${escapeHTML(country)}</h2>
        <ul class="facts">
          <li><strong>${stats.total}</strong> platos</li>
          <li><strong>${stats.avgIngredients}</strong> ingredientes de media</li>
          ${
            stats.topIngredient
              ? `<li>Ingrediente estrella: <strong>${escapeHTML(stats.topIngredient.name)}</strong>
                 (${stats.topIngredient.count})</li>`
              : ''
          }
        </ul>
        ${notes.map((n) => `<p class="country__note">${escapeHTML(n)}</p>`).join('')}
      </div>
    </div>`;
}

function renderCategoryChips(container, categories, active) {
  const total = categories.reduce((sum, [, count]) => sum + count, 0);
  const chips = [['all', total], ...categories];

  container.innerHTML = categories.length
    ? chips
        .map(
          ([name, count]) => `
          <button type="button" class="chip ${name === active ? 'chip--active' : ''}"
                  data-category="${escapeHTML(name)}" aria-pressed="${name === active}">
            ${name === 'all' ? 'Todo' : escapeHTML(name)} <span>${count}</span>
          </button>`,
        )
        .join('')
    : '';
}

/* ---------- Tarjetas ---------- */

function renderMealCards(container, meals) {
  container.innerHTML = `
    <ul class="grid">
      ${meals
        .map(
          (meal) => `
          <li>
            <button type="button" class="card" data-meal-id="${escapeHTML(meal.id)}">
              <img src="${escapeHTML(thumbnail(meal.image))}" alt="" loading="lazy" />
              <span class="card__tag">${escapeHTML(meal.category)}</span>
              <span class="card__name">${escapeHTML(meal.name)}</span>
              <span class="card__meta">${meal.ingredients.length} ingredientes</span>
            </button>
          </li>`,
        )
        .join('')}
    </ul>`;
  useImageFallback(container);
}

/* ---------- Detalle (modal) ---------- */

function renderMealDetail(container, meal) {
  const links = [
    meal.youtube && `<a class="btn" href="${escapeHTML(meal.youtube)}" target="_blank" rel="noopener">▶ Ver vídeo</a>`,
    meal.source && `<a class="btn btn--ghost" href="${escapeHTML(meal.source)}" target="_blank" rel="noopener">Receta original</a>`,
  ].filter(Boolean);

  container.innerHTML = `
    <article class="detail">
      <img class="detail__img" src="${escapeHTML(meal.image)}" alt="${escapeHTML(meal.name)}" />
      <div class="detail__body">
        <p class="detail__kicker">${escapeHTML(meal.country)} · ${escapeHTML(meal.category)}</p>
        <h2 id="detail-title">${escapeHTML(meal.name)}</h2>
        ${
          meal.tags.length
            ? `<p class="tags">${meal.tags.map((t) => `<span>#${escapeHTML(t)}</span>`).join(' ')}</p>`
            : ''
        }
        <h3>Ingredientes</h3>
        ${
          meal.ingredients.length
            ? `<ul class="ingredients">${meal.ingredients
                .map(
                  ({ name, measure }) =>
                    `<li><span>${escapeHTML(name)}</span><em>${escapeHTML(measure || 'al gusto')}</em></li>`,
                )
                .join('')}</ul>`
            : '<p>Esta receta no indica ingredientes.</p>'
        }
        <h3>Preparación</h3>
        ${
          meal.steps.length
            ? `<ol class="steps">${meal.steps.map((s) => `<li>${escapeHTML(s)}</li>`).join('')}</ol>`
            : '<p>Sin instrucciones. Toca improvisar 👨‍🍳</p>'
        }
        ${links.length ? `<p class="links">${links.join('')}</p>` : ''}
      </div>
    </article>`;
  useImageFallback(container);
}

// ==========================================================
// MAIN: estado y eventos
// ==========================================================

/**
 * Punto de entrada: guarda el estado, escucha eventos y coordina
 * API (datos crudos) -> lógica (transformación) -> render (DOM).
 */

// Máximo de recetas completas que se piden en paralelo por país.
const MAX_DETAILS = 16;

const $ = (selector) => document.querySelector(selector);
const dom = {
  areaSelect: $('#area-select'),
  randomBtn: $('#random-btn'),
  search: $('#search'),
  stamps: $('#stamps'),
  header: $('#country-header'),
  chips: $('#chips'),
  results: $('#results'),
  dialog: $('#detail-dialog'),
  detail: $('#detail-content'),
};

const state = {
  areas: [],
  stamps: loadStamps(),
  country: '',
  meals: [],
  totalAvailable: 0,
  failed: 0,
  filters: { query: '', category: 'all' },
};

// Un controlador por "zona" para cancelar peticiones que se han quedado viejas.
let areaRequest = null;
let detailRequest = null;

const isAbort = (error) => error?.name === 'AbortError';

function describeError(error) {
  if (error instanceof ApiError) return error.message;
  console.error(error);
  return 'Ha pasado algo inesperado. Inténtalo de nuevo.';
}

/* ---------- Carga inicial: lista de países ---------- */

async function loadAreas() {
  dom.areaSelect.disabled = true;
  renderLoading(dom.results, 'Desplegando el mapa del mundo…');

  try {
    state.areas = normalizeAreas(await getAreas());
    renderAreaOptions(dom.areaSelect, state.areas);

    if (state.areas.length === 0) {
      renderEmpty(dom.results, 'La API no ha devuelto ningún país. Prueba con «Sorpréndeme».');
      return;
    }
    renderEmpty(dom.results, 'Elige un destino o pulsa un sello para empezar el viaje.');
  } catch (error) {
    renderError(dom.results, describeError(error), loadAreas);
  }
}

/* ---------- Platos de un país ---------- */

async function loadArea(area) {
  areaRequest?.abort();
  const controller = new AbortController();
  areaRequest = controller;
  const { signal } = controller;

  const country =
    [...state.areas, ...state.stamps].find((a) => a.area === area)?.country ?? area;
  dom.areaSelect.value = area;
  dom.search.value = '';
  Object.assign(state, { country: '', meals: [], filters: { query: '', category: 'all' } });
  dom.search.disabled = true;
  renderCountryHeader(dom.header, {});
  renderCategoryChips(dom.chips, [], 'all');
  renderLoading(dom.results, `Viajando a ${country}…`);

  try {
    const summaries = normalizeMealSummaries(await getMealsByArea(area, { signal }));

    if (summaries.length === 0) {
      renderEmpty(dom.results, `${country} todavía no tiene recetas en TheMealDB. ¡Prueba otro destino!`);
      return;
    }

    // Pedimos las fichas completas en paralelo; si alguna falla, seguimos con el resto.
    const selected = summaries.slice(0, MAX_DETAILS);
    const settled = await Promise.allSettled(selected.map(({ id }) => getMealById(id, { signal })));
    if (signal.aborted) return;

    const meals = settled
      .filter((result) => result.status === 'fulfilled')
      .map((result) => normalizeMeal(result.value))
      .filter(Boolean);

    if (meals.length === 0) {
      throw new ApiError(`No se pudo cargar ninguna receta de ${country}.`);
    }

    Object.assign(state, {
      country,
      meals,
      totalAvailable: summaries.length,
      failed: selected.length - meals.length,
    });
    state.stamps = addStamp(state.stamps, { area, country });
    renderStamps(dom.stamps, state.stamps);
    dom.search.disabled = false;
    updateResults();
  } catch (error) {
    if (isAbort(error)) return;
    renderError(dom.results, describeError(error), () => loadArea(area));
  }
}

/** Repinta cabecera, chips y tarjetas a partir del estado (sin peticiones). */
function updateResults() {
  const stats = buildCountryStats(state.meals);
  const visible = filterMeals(state.meals, state.filters);

  renderCountryHeader(dom.header, {
    country: state.country,
    stats,
    totalAvailable: state.totalAvailable,
    failed: state.failed,
  });
  renderCategoryChips(dom.chips, stats.categories, state.filters.category);

  if (visible.length === 0) {
    renderEmpty(dom.results, `Ningún plato coincide con «${state.filters.query}». Prueba con otro ingrediente.`);
    return;
  }
  renderMealCards(dom.results, visible);
}

/* ---------- Detalle de un plato (modal) ---------- */

async function openDetail(loadRawMeal) {
  detailRequest?.abort();
  const controller = new AbortController();
  detailRequest = controller;

  if (!dom.dialog.open) dom.dialog.showModal();
  renderLoading(dom.detail, 'Emplatando…');

  try {
    const meal = await loadRawMeal(controller.signal);
    if (controller.signal.aborted) return;

    if (!meal) {
      renderEmpty(dom.detail, 'Esta receta se ha perdido por el camino. Prueba con otra.');
      return;
    }
    renderMealDetail(dom.detail, meal);
  } catch (error) {
    if (isAbort(error)) return;
    renderError(dom.detail, describeError(error), () => openDetail(loadRawMeal));
  }
}

const openMealById = (id) =>
  openDetail(async (signal) => {
    // Si ya la tenemos cargada no hace falta volver a pedirla.
    const cached = state.meals.find((meal) => meal.id === id);
    return cached ?? normalizeMeal(await getMealById(id, { signal }));
  });

const openRandomMeal = () =>
  openDetail(async (signal) => normalizeMeal(await getRandomMeal({ signal })));

/* ---------- Eventos ---------- */

dom.areaSelect.addEventListener('change', (event) => {
  if (event.target.value) loadArea(event.target.value);
});

dom.stamps.addEventListener('click', (event) => {
  const stamp = event.target.closest('[data-area]');
  if (stamp) loadArea(stamp.dataset.area);
});

dom.search.addEventListener('input', (event) => {
  state.filters.query = event.target.value;
  updateResults();
});

dom.chips.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-category]');
  if (!chip) return;
  state.filters.category = chip.dataset.category;
  updateResults();
});

dom.results.addEventListener('click', (event) => {
  const card = event.target.closest('[data-meal-id]');
  if (card) openMealById(card.dataset.mealId);
});

dom.randomBtn.addEventListener('click', openRandomMeal);

dom.dialog.addEventListener('close', () => detailRequest?.abort());
dom.dialog.addEventListener('click', (event) => {
  // Clic en el fondo o en el botón de cerrar.
  if (event.target === dom.dialog || event.target.closest('[data-close]')) dom.dialog.close();
});

/* ---------- Arranque ---------- */

renderStamps(dom.stamps, state.stamps);
loadAreas();
