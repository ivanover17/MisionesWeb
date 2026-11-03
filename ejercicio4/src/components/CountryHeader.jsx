import { initials } from '../logic/meals.js';

/** Cabecera del país con sus estadísticas (ya calculadas por el padre). */
export default function CountryHeader({ country, stats, totalAvailable, failed }) {
  const shown = stats.total + failed;

  return (
    <div className="country">
      <div className="country__seal" aria-hidden="true">
        {initials(country)}
      </div>
      <div>
        <h2 className="country__title">{country}</h2>
        <ul className="facts">
          <li>
            <strong>{stats.total}</strong> platos
          </li>
          <li>
            <strong>{stats.avgIngredients}</strong> ingredientes de media
          </li>
          {stats.topIngredient && (
            <li>
              Ingrediente estrella: <strong>{stats.topIngredient.name}</strong> (
              {stats.topIngredient.count})
            </li>
          )}
        </ul>
        {totalAvailable > shown && (
          <p className="country__note">
            Mostrando {shown} de {totalAvailable} platos.
          </p>
        )}
        {failed > 0 && <p className="country__note">{failed} receta(s) no se pudieron cargar.</p>}
      </div>
    </div>
  );
}
