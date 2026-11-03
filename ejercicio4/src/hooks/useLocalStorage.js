import { useEffect, useState } from 'react';

const acceptAnything = () => true;

function read(key, fallback, isValid) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    // JSON roto o almacenamiento bloqueado: empezamos de cero.
    return fallback;
  }
}

/**
 * Como useState, pero el valor se guarda en localStorage.
 *
 * - El valor inicial se lee UNA vez con inicialización perezosa
 *   (useState(() => ...)), no en cada render.
 * - Efecto 1: cada vez que cambia el valor, se escribe en localStorage
 *   (sincronizar con un sistema externo: justo para lo que sirve useEffect).
 * - Efecto 2: escucha el evento "storage" para que, si tienes la app abierta en
 *   dos pestañas, los cambios de una aparezcan en la otra. Tiene cleanup para
 *   quitar el listener.
 *
 * `initialValue` e `isValid` deben ser estables (constantes fuera del
 * componente), porque son dependencias del segundo efecto.
 */
export function useLocalStorage(key, initialValue, isValid = acceptAnything) {
  const [value, setValue] = useState(() => read(key, initialValue, isValid));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin almacenamiento: el valor solo dura esta sesión.
    }
  }, [key, value]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key === key) setValue(read(key, initialValue, isValid));
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, initialValue, isValid]);

  return [value, setValue];
}
