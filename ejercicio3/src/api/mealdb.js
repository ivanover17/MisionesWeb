/**
 * Capa de acceso a TheMealDB.
 * Solo sabe hablar HTTP: pide, valida la respuesta y devuelve JSON crudo.
 * No transforma datos ni toca el DOM.
 */

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const TIMEOUT_MS = 8000;

/** Error propio para distinguir fallos de la API de bugs del código. */
export class ApiError extends Error {
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

export async function getAreas(options) {
  return extractMeals(await fetchJSON('/list.php?a=list', options));
}

export async function getMealsByArea(area, options) {
  return extractMeals(await fetchJSON(`/filter.php?a=${encodeURIComponent(area)}`, options));
}

export async function getMealById(id, options) {
  const [meal] = extractMeals(await fetchJSON(`/lookup.php?i=${encodeURIComponent(id)}`, options));
  return meal ?? null;
}

export async function getRandomMeal(options) {
  const [meal] = extractMeals(await fetchJSON('/random.php', options));
  return meal ?? null;
}
