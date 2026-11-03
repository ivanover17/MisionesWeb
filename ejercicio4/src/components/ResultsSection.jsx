import { useState } from 'react';
import { buildCountryStats, filterMeals } from '../logic/meals.js';
import CategoryChips from './CategoryChips.jsx';
import CountryHeader from './CountryHeader.jsx';
import MealGrid from './MealGrid.jsx';
import { EmptyState, ErrorMessage, Loading } from './Status.jsx';

/**
 * Zona de resultados: decide qué enseñar según el estado de la petición.
 *
 * La categoría elegida es estado LOCAL de este componente porque nadie más la
 * necesita. El padre lo monta con key={país o búsqueda}: al cambiar de país,
 * React crea un componente nuevo y la categoría vuelve a "Todo" sola, sin
 * tener que resetearla a mano ni con un efecto.
 */
export default function ResultsSection({ request, country, searchTerm, filterQuery, onOpenMeal }) {
  const [category, setCategory] = useState('all');

  if (request.status === 'idle') {
    return <EmptyState>Elige un destino o pulsa un sello para empezar el viaje.</EmptyState>;
  }

  if (request.status === 'loading') {
    return (
      <Loading
        message={country ? `Viajando a ${country}…` : `Buscando «${searchTerm}» por todo el mundo…`}
      />
    );
  }

  if (request.status === 'error') {
    return <ErrorMessage error={request.error} onRetry={request.retry} />;
  }

  const { meals, totalAvailable, failed } = request.data;

  if (meals.length === 0) {
    return (
      <EmptyState>
        {country
          ? `${country} todavía no tiene recetas en TheMealDB. ¡Prueba otro destino!`
          : `No hay ninguna receta con «${searchTerm}». Prueba en inglés: chicken, pasta, rice…`}
      </EmptyState>
    );
  }

  // Todo esto se DERIVA de los datos en cada render; no se guarda en el estado.
  const stats = buildCountryStats(meals);
  const visible = filterMeals(meals, { query: filterQuery, category });

  return (
    <>
      {country ? (
        <CountryHeader
          country={country}
          stats={stats}
          totalAvailable={totalAvailable}
          failed={failed}
        />
      ) : (
        <h2 className="results__title">
          {meals.length} resultado{meals.length === 1 ? '' : 's'} para «{searchTerm}»
        </h2>
      )}

      <CategoryChips categories={stats.categories} active={category} onChange={setCategory} />

      {visible.length > 0 ? (
        <MealGrid meals={visible} onOpenMeal={onOpenMeal} />
      ) : (
        <EmptyState>Ningún plato coincide con «{filterQuery}». Prueba con otro ingrediente.</EmptyState>
      )}
    </>
  );
}
