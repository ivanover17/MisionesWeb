/**
 * Funciones de "alto nivel": combinan la capa HTTP (mealdb.js) con la lógica
 * pura (meals.js) y devuelven datos ya limpios. Son las que usan los hooks.
 * Todas reciben un AbortSignal para poder cancelarse.
 */
import {
  ApiError,
  getAreas,
  getMealById,
  getMealsByArea,
  getRandomMeal,
  searchMealsByName,
} from './mealdb.js';
import { normalizeAreas, normalizeMeal, normalizeMealSummaries } from '../logic/meals.js';

// Máximo de recetas completas que se piden en paralelo por país.
const MAX_DETAILS = 16;

export async function fetchAreas(signal) {
  return normalizeAreas(await getAreas({ signal }));
}

/**
 * Platos de un país. filter.php solo da nombre y foto, así que pedimos las
 * fichas completas en paralelo con Promise.allSettled: si alguna falla,
 * seguimos con el resto y contamos cuántas fallaron.
 */
export async function fetchAreaMeals(area, signal) {
  const summaries = normalizeMealSummaries(await getMealsByArea(area, { signal }));
  if (summaries.length === 0) return { meals: [], totalAvailable: 0, failed: 0 };

  const selected = summaries.slice(0, MAX_DETAILS);
  const settled = await Promise.allSettled(selected.map(({ id }) => getMealById(id, { signal })));

  const meals = settled
    .filter((result) => result.status === 'fulfilled')
    .map((result) => normalizeMeal(result.value))
    .filter(Boolean);

  if (meals.length === 0 && !signal?.aborted) {
    throw new ApiError('No se pudo cargar ninguna receta de este país.');
  }

  return { meals, totalAvailable: summaries.length, failed: selected.length - meals.length };
}

export async function searchRecipes(query, signal) {
  return (await searchMealsByName(query, { signal })).map(normalizeMeal).filter(Boolean);
}

export async function fetchMeal(id, signal) {
  return normalizeMeal(await getMealById(id, { signal }));
}

export async function fetchRandomMeal(signal) {
  return normalizeMeal(await getRandomMeal({ signal }));
}
