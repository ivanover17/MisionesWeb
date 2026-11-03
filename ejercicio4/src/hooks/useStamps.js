import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage.js';

const KEY = 'pasaporte-gastronomico:sellos';
const MAX_STAMPS = 12;
const NO_STAMPS = [];
const isStampList = (value) =>
  Array.isArray(value) &&
  value.every((s) => typeof s?.area === 'string' && typeof s?.country === 'string');

/** Sellos del pasaporte (países visitados), guardados en localStorage. */
export function useStamps() {
  const [stamps, setStamps] = useLocalStorage(KEY, NO_STAMPS, isStampList);

  // useCallback para que sea estable: useAreaMeals lo usa como dependencia.
  // Se usa la forma funcional (prev => ...) para no depender de `stamps`.
  const addStamp = useCallback(
    (stamp) =>
      setStamps((prev) =>
        [stamp, ...prev.filter((s) => s.area !== stamp.area)].slice(0, MAX_STAMPS),
      ),
    [setStamps],
  );

  return { stamps, addStamp };
}
