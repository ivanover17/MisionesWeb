import { areasRespuestaSchema } from '../schemas/reserva.js';
import { pedirJSON } from './http.js';

const MEALDB = 'https://www.themealdb.com/api/json/v1/1';

// Países de TheMealDB para el desplegable (los mismos que en el Pasaporte de la M2/M3).
export async function getAreas({ signal } = {}) {
  const datos = await pedirJSON(`${MEALDB}/list.php?a=list`, {
    signal,
    sinConexion: 'No se han podido cargar los países de TheMealDB. ¿Tienes conexión a internet?',
  });

  // Reto bonus: no me fío de lo que llega de fuera.
  const resultado = areasRespuestaSchema.safeParse(datos);
  if (!resultado.success) {
    throw new Error('TheMealDB ha devuelto los países con un formato inesperado');
  }

  return resultado.data.meals
    .map((m) => m.strArea)
    .filter((area) => area !== 'Unknown')
    .sort((a, b) => a.localeCompare(b));
}
