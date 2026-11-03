import { ApiError } from '../api/mealdb.js';

/** Los tres estados "de espera" que se repiten por toda la app. */

export function Loading({ message = 'Preparando los fogones…' }) {
  return (
    <div className="status status--loading" role="status" aria-live="polite">
      <div className="pot" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{message}</p>
    </div>
  );
}

function describeError(error) {
  if (error instanceof ApiError) return error.message;
  console.error(error);
  return 'Ha pasado algo inesperado. Inténtalo de nuevo.';
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="status status--error" role="alert">
      <p className="status__icon" aria-hidden="true">🔥</p>
      <p>
        <strong>Se nos ha quemado la receta.</strong>
      </p>
      <p>{describeError(error)}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = '🍽️', children }) {
  return (
    <div className="status status--empty">
      <p className="status__icon" aria-hidden="true">{icon}</p>
      <p>{children}</p>
    </div>
  );
}
