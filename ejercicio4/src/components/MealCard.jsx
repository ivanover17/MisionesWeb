import { thumbnail } from '../logic/meals.js';
import SafeImage from './SafeImage.jsx';

export default function MealCard({ meal, inBasket, onOpen }) {
  return (
    <button type="button" className="card" onClick={() => onOpen(meal.id)}>
      <SafeImage src={thumbnail(meal.image)} loading="lazy" />
      <span className="card__tag">{meal.category}</span>
      {inBasket && (
        <span className="card__basket" title="Está en tu cesta">
          🧺
        </span>
      )}
      <span className="card__name">{meal.name}</span>
      <span className="card__meta">{meal.ingredients.length} ingredientes</span>
    </button>
  );
}
