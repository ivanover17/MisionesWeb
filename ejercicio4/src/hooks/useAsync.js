import { useCallback, useEffect, useState } from 'react';

/**
 * Custom hook genérico para cargar datos asíncronos (mi "useFetch").
 *
 * Recibe una función `asyncFn(signal)` que devuelve una promesa, o `null` si
 * todavía no hay nada que pedir. Devuelve { status, data, error, retry }.
 *
 * - La petición vive en un useEffect porque es sincronizar el componente con
 *   algo externo (la red). Depende de [asyncFn, attempt]: si cambia la función
 *   (otro país, otra búsqueda) o se pulsa "Reintentar", se vuelve a pedir.
 * - El cleanup aborta la petición anterior con AbortController. Así una
 *   respuesta vieja nunca pisa a una nueva (el mismo bug que tuve en la M2).
 * - El estado guarda el resultado JUNTO con la petición que lo produjo. Si no
 *   coincide con la petición actual, se deriva que está cargando: no hace falta
 *   un setState('loading') dentro del efecto ni puede verse un dato viejo.
 *
 * IMPORTANTE: quien lo usa debe pasar una función estable (definida fuera del
 * componente o envuelta en useCallback); si no, se pediría en cada render.
 */
export function useAsync(asyncFn) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!asyncFn) return undefined;

    const controller = new AbortController();
    const save = (data, error) => {
      if (!controller.signal.aborted) setResult({ asyncFn, attempt, data, error });
    };

    asyncFn(controller.signal).then(
      (data) => save(data, null),
      (error) => save(null, error),
    );

    return () => controller.abort();
  }, [asyncFn, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!asyncFn) return { status: 'idle', data: null, error: null, retry };

  const isCurrent = result?.asyncFn === asyncFn && result.attempt === attempt;
  if (!isCurrent) return { status: 'loading', data: null, error: null, retry };

  return {
    status: result.error ? 'error' : 'success',
    data: result.data,
    error: result.error,
    retry,
  };
}
