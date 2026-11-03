import MealCard from './MealCard.jsx';

/** Rejilla de tarjetas. La key es el id del plato que da la API: único y estable. */
export default function MealGrid({ meals, basketMealIds, onOpenMeal }) {
  return (
    <ul className="grid">
      {meals.map((meal) => (
        <li key={meal.id}>
          <MealCard meal={meal} inBasket={basketMealIds.has(meal.id)} onOpen={onOpenMeal} />
        </li>
      ))}
    </ul>
  );
}
