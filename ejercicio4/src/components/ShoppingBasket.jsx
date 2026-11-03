import { useEffect, useState } from 'react';
import { basketToText, groupByIngredient, recipesIn } from '../logic/basket.js';

/**
 * Cesta de la compra: junta los ingredientes de las recetas que añades,
 * agrupados por ingrediente, y los puedes ir tachando mientras compras.
 */
export default function ShoppingBasket({ items, onToggle, onRemoveRecipe, onClearBought }) {
  const [copied, setCopied] = useState(false);

  // El aviso "¡Copiada!" se quita solo a los 2 s. El cleanup cancela el
  // temporizador si se vuelve a copiar antes o si el componente se desmonta.
  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  // Valores derivados: nada de esto se guarda en el estado.
  const groups = groupByIngredient(items);
  const recipes = recipesIn(items);
  const pending = groups.filter((group) => !group.done).length;
  const bought = groups.length - pending;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(basketToText(groups));
      setCopied(true);
    } catch {
      // Sin permiso para el portapapeles: no pasa nada, el botón no hace nada.
    }
  }

  return (
    <section aria-labelledby="basket-title" className="basket">
      <h2 id="basket-title" className="section-title">
        Mi cesta de la compra{' '}
        {groups.length > 0 && <small>({pending} por comprar)</small>}
      </h2>

      {items.length === 0 ? (
        <p className="stamps__empty">
          Abre una receta y pulsa «🧺 Añadir a la cesta». Si dos recetas llevan lo mismo, se junta en
          una sola línea.
        </p>
      ) : (
        <>
          <ul className="basket__recipes" aria-label="Recetas en la cesta">
            {recipes.map(({ id, name }) => (
              <li key={id}>
                {name}
                <button
                  type="button"
                  aria-label={`Quitar ${name} de la cesta`}
                  onClick={() => onRemoveRecipe(id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <ul className="basket__list">
            {groups.map(({ key, name, done, lines }) => (
              <li key={key} className={done ? 'is-done' : undefined}>
                <label>
                  <input type="checkbox" checked={done} onChange={() => onToggle(key)} />
                  <span className="basket__name">{name}</span>
                  <span className="basket__measures">
                    {lines.map((line) => `${line.measure || 'al gusto'} · ${line.mealName}`).join('  |  ')}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <p className="basket__actions">
            <button type="button" className="btn btn--ghost" onClick={handleCopy}>
              {copied ? '✓ ¡Copiada!' : '📋 Copiar lista'}
            </button>
            {bought > 0 && (
              <button type="button" className="btn btn--ghost" onClick={onClearBought}>
                Quitar comprados ({bought})
              </button>
            )}
          </p>
        </>
      )}
    </section>
  );
}
