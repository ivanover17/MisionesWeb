import { useEffect, useState } from 'react';

/**
 * Devuelve `value`, pero solo cuando lleva `delay` ms sin cambiar.
 * Sirve para no lanzar una búsqueda a la API en cada tecla.
 * El cleanup cancela el temporizador anterior cada vez que se escribe.
 */
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
