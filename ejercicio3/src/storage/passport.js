/**
 * Sellos del pasaporte: países ya visitados, guardados en localStorage.
 * Si el navegador bloquea el almacenamiento la app sigue funcionando sin sellos.
 */

const KEY = 'pasaporte-gastronomico:sellos';
const MAX_STAMPS = 12;

export function loadStamps() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s?.area === 'string') : [];
  } catch {
    return [];
  }
}

export function addStamp(stamps, { area, country }) {
  const next = [{ area, country }, ...stamps.filter((s) => s.area !== area)].slice(0, MAX_STAMPS);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento: los sellos solo duran esta sesión.
  }
  return next;
}
