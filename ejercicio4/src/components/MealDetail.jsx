import SafeImage from './SafeImage.jsx';

export const DETAIL_TITLE_ID = 'detail-title';

/**
 * Ficha completa de una receta. `extraActions` permite al padre añadir botones
 * (por ejemplo "Otra al azar") sin que este componente sepa de dónde viene.
 * El botón de la cesta solo avisa al padre: la cesta no vive aquí.
 */
export default function MealDetail({ meal, inBasket, onToggleBasket, extraActions = null }) {
  return (
    <article className="detail">
      <SafeImage className="detail__img" src={meal.image} alt={meal.name} />

      <div className="detail__body">
        <p className="detail__kicker">
          {meal.country} · {meal.category}
        </p>
        <h2 id={DETAIL_TITLE_ID}>{meal.name}</h2>

        {meal.tags.length > 0 && (
          <p className="tags">
            {meal.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </p>
        )}

        <div className="detail__actions">
          {meal.ingredients.length > 0 && (
            <button
              type="button"
              className={`btn ${inBasket ? 'btn--ghost' : ''}`}
              aria-pressed={inBasket}
              onClick={() => onToggleBasket(meal)}
            >
              {inBasket ? '✓ En la cesta · Quitar' : '🧺 Añadir a la cesta'}
            </button>
          )}
          {extraActions}
        </div>

        <h3>Ingredientes</h3>
        {meal.ingredients.length > 0 ? (
          <ul className="ingredients">
            {meal.ingredients.map(({ slot, name, measure }) => (
              <li key={slot}>
                <span>{name}</span>
                <em>{measure || 'al gusto'}</em>
              </li>
            ))}
          </ul>
        ) : (
          <p>Esta receta no indica ingredientes.</p>
        )}

        <h3>Preparación</h3>
        {meal.steps.length > 0 ? (
          <ol className="steps">
            {meal.steps.map(({ n, text }) => (
              <li key={n}>{text}</li>
            ))}
          </ol>
        ) : (
          <p>Sin instrucciones. Toca improvisar 👨‍🍳</p>
        )}

        {(meal.youtube || meal.source) && (
          <p className="links">
            {meal.youtube && (
              <a className="btn" href={meal.youtube} target="_blank" rel="noreferrer">
                ▶ Ver vídeo
              </a>
            )}
            {meal.source && (
              <a className="btn btn--ghost" href={meal.source} target="_blank" rel="noreferrer">
                Receta original
              </a>
            )}
          </p>
        )}
      </div>
    </article>
  );
}
