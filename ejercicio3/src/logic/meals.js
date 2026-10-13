/**
 * Lógica pura: convierte los datos crudos de TheMealDB en objetos limpios
 * y calcula estadísticas. Sin fetch y sin DOM, así que es fácil de probar.
 */

const MAX_INGREDIENTS = 20;
// Plato vacío en línea (data URI): no depende de rutas, así funciona con Vite, Live Server o file://.
export const FALLBACK_IMAGE = `data:image/svg+xml,${encodeURIComponent(
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
export function normalizeAreas(rawAreas) {
  const areas = rawAreas
    .map((raw) => ({ area: clean(raw?.strArea), country: clean(raw?.strCountry) }))
    .filter(({ area }) => area && area.toLowerCase() !== 'unknown')
    .map(({ area, country }) => ({ area, country: country || area }));

  const unique = new Map(areas.map((item) => [item.area, item]));
  return [...unique.values()].sort((a, b) => a.country.localeCompare(b.country, 'es'));
}

/** Resumen de plato (lo que devuelve filter.php). Descarta los que no tienen id o nombre. */
export function normalizeMealSummaries(rawMeals) {
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
export function extractIngredients(raw) {
  return Array.from({ length: MAX_INGREDIENTS }, (_, i) => ({
    name: clean(raw?.[`strIngredient${i + 1}`]),
    measure: clean(raw?.[`strMeasure${i + 1}`]),
  })).filter(({ name }) => name);
}

/** Plato completo (lookup.php / random.php) listo para pintar. */
export function normalizeMeal(raw) {
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
export function buildCountryStats(meals) {
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
export function filterMeals(meals, { query = '', category = 'all' } = {}) {
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
