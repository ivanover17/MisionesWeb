import { useCallback } from 'react';
import { fetchAreaMeals, fetchAreas, fetchRandomMeal, searchRecipes } from '../api/recipes.js';
import { useAsync } from './useAsync.js';

/**
 * Hooks "de dominio": cada uno prepara la función de carga adecuada y se la
 * pasa a useAsync. Así los componentes no saben nada de fetch ni de AbortController.
 */

/** Lista de países. fetchAreas está fuera del componente, así que ya es estable. */
export function useAreas() {
  return useAsync(fetchAreas);
}

/**
 * Platos de un país. Cuando terminan de cargar bien y hay al menos uno,
 * avisa con onVisit para poner el sello. `onVisit` debe ser estable.
 */
export function useAreaMeals(area, onVisit) {
  const load = useCallback(
    async (signal) => {
      const result = await fetchAreaMeals(area, signal);
      if (!signal.aborted && result.meals.length > 0) {
        onVisit({ area, country: result.meals[0].country });
      }
      return result;
    },
    [area, onVisit],
  );

  return useAsync(area ? load : null);
}

/** Búsqueda por nombre en todas las recetas. Sin texto no se pide nada. */
export function useRecipeSearch(term) {
  const load = useCallback(async (signal) => {
    const meals = await searchRecipes(term, signal);
    return { meals, totalAvailable: meals.length, failed: 0 };
  }, [term]);

  return useAsync(term ? load : null);
}

/** Receta al azar. Llamar a retry() trae otra distinta. */
export function useRandomMeal() {
  return useAsync(fetchRandomMeal);
}
