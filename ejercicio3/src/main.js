/**
 * Punto de entrada: guarda el estado, escucha eventos y coordina
 * API (datos crudos) -> lógica (transformación) -> render (DOM).
 */
import './style.css';
import { ApiError, getAreas, getMealById, getMealsByArea, getRandomMeal } from './api/mealdb.js';
import {
  buildCountryStats,
  filterMeals,
  normalizeAreas,
  normalizeMeal,
  normalizeMealSummaries,
} from './logic/meals.js';
import { addStamp, loadStamps } from './storage/passport.js';
import {
  renderAreaOptions,
  renderCategoryChips,
  renderCountryHeader,
  renderEmpty,
  renderError,
  renderLoading,
  renderMealCards,
  renderMealDetail,
  renderStamps,
} from './ui/render.js';

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
