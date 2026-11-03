/**
 * Lógica pura de la cesta de la compra.
 *
 * El estado guardado es solo una lista plana de líneas, una por ingrediente
 * de cada receta añadida:
 *   { id: '52772:3', mealId: '52772', mealName: 'Paella', ingredient: 'Garlic', measure: '3 cloves', done: false }
 * Todo lo demás (agrupar por ingrediente, cuántos faltan, qué recetas hay,
 * el texto para copiar) se calcula a partir de esa lista.
 */

const keyOf = (ingredient) => ingredient.toLowerCase();

export const isBasket = (value) =>
  Array.isArray(value) &&
  value.every((item) => typeof item?.id === 'string' && typeof item?.ingredient === 'string');

/** Añade (o vuelve a añadir) todos los ingredientes de una receta. */
export function addRecipe(items, meal) {
  const lines = meal.ingredients.map(({ slot, name, measure }) => ({
    id: `${meal.id}:${slot}`,
    mealId: meal.id,
    mealName: meal.name,
    ingredient: name,
    measure,
    done: false,
  }));
  return [...removeRecipe(items, meal.id), ...lines];
}

export function removeRecipe(items, mealId) {
  return items.filter((item) => item.mealId !== mealId);
}

/** Marca o desmarca un ingrediente en TODAS las recetas a la vez. */
export function toggleIngredient(items, key) {
  const allDone = items.filter((item) => keyOf(item.ingredient) === key).every((item) => item.done);
  return items.map((item) => (keyOf(item.ingredient) === key ? { ...item, done: !allDone } : item));
}

export function clearDone(items) {
  return items.filter((item) => !item.done);
}

/**
 * Agrupa las líneas por ingrediente: si el ajo sale en tres recetas, aparece
 * una sola vez con las tres cantidades. Los pendientes van primero.
 */
export function groupByIngredient(items) {
  const groups = items.reduce((map, item) => {
    const key = keyOf(item.ingredient);
    const group = map.get(key) ?? { key, name: item.ingredient, lines: [] };
    return map.set(key, { ...group, lines: [...group.lines, item] });
  }, new Map());

  return [...groups.values()]
    .map((group) => ({ ...group, done: group.lines.every((line) => line.done) }))
    .sort((a, b) => a.done - b.done || a.name.localeCompare(b.name, 'es'));
}

/** Recetas distintas que hay en la cesta, en orden de llegada. */
export function recipesIn(items) {
  const unique = new Map(items.map((item) => [item.mealId, item.mealName]));
  return [...unique].map(([id, name]) => ({ id, name }));
}

/** Lista en texto plano para copiar al portapapeles y pegarla en el móvil. */
export function basketToText(groups) {
  return groups
    .map(({ name, done, lines }) => {
      const measures = lines.map((line) => `${line.measure || 'al gusto'} (${line.mealName})`);
      return `${done ? '☑' : '☐'} ${name}: ${measures.join(', ')}`;
    })
    .join('\n');
}
