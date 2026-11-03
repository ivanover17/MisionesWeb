import { useCallback } from 'react';
import { addRecipe, clearDone, isBasket, removeRecipe, toggleIngredient } from '../logic/basket.js';
import { useLocalStorage } from './useLocalStorage.js';

const KEY = 'pasaporte-gastronomico:cesta';
const EMPTY = [];

/**
 * Cesta de la compra persistente. Reutiliza useLocalStorage y expone acciones
 * con nombre, para que los componentes no manipulen el array a mano.
 * Todas usan la forma funcional de setState (prev => ...).
 */
export function useBasket() {
  const [items, setItems] = useLocalStorage(KEY, EMPTY, isBasket);

  const add = useCallback((meal) => setItems((prev) => addRecipe(prev, meal)), [setItems]);
  const remove = useCallback((mealId) => setItems((prev) => removeRecipe(prev, mealId)), [setItems]);
  const toggle = useCallback((key) => setItems((prev) => toggleIngredient(prev, key)), [setItems]);
  const clearBought = useCallback(() => setItems(clearDone), [setItems]);

  return { items, add, remove, toggle, clearBought };
}
