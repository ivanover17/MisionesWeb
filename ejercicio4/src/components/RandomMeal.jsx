import { useRandomMeal } from '../hooks/useRecipes.js';
import MealDetail from './MealDetail.jsx';
import { EmptyState, ErrorMessage, Loading } from './Status.jsx';

/**
 * Receta al azar. La petición empieza al montarse (cuando se abre la modal)
 * y se cancela sola al desmontarse (cuando se cierra), gracias a useAsync.
 * "Otra al azar" reutiliza retry(): misma función, nueva petición, otro plato.
 */
export default function RandomMeal() {
  const { status, data: meal, error, retry } = useRandomMeal();

  if (status === 'loading') return <Loading message="Emplatando…" />;
  if (status === 'error') return <ErrorMessage error={error} onRetry={retry} />;
  if (!meal) return <EmptyState>Esta receta se ha perdido por el camino. Prueba con otra.</EmptyState>;

  return (
    <MealDetail
      meal={meal}
      extraActions={
        <button type="button" className="btn btn--accent" onClick={retry}>
          🎲 Otra al azar
        </button>
      }
    />
  );
}
