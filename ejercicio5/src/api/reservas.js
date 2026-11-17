import { z } from 'zod';
import { reservaSchema } from '../schemas/reserva.js';
import { pedirJSON } from './http.js';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/**
 * GET /reservas (opcionalmente filtrado por país).
 *
 * Reto bonus: cada reserva se valida con safeParse. Las que no cumplen el
 * esquema NO se pintan; se devuelven aparte en `descartadas` con el motivo,
 * para enseñarlas como aviso en lugar de romper la página entera.
 */
export async function getReservas({ area = '', signal } = {}) {
  const params = new URLSearchParams({ _sort: 'fecha', _order: 'asc' });
  if (area) params.set('area', area);

  const datos = await pedirJSON(`${API_URL}/reservas?${params}`, { signal });

  const lista = z.array(z.unknown()).safeParse(datos);
  if (!lista.success) {
    throw new Error('El servidor no ha devuelto una lista de reservas');
  }

  const reservas = [];
  const descartadas = [];
  for (const item of lista.data) {
    const resultado = reservaSchema.safeParse(item);
    if (resultado.success) {
      reservas.push(resultado.data);
    } else {
      descartadas.push({
        id: item?.id ?? '¿sin id?',
        problemas: resultado.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`),
      });
    }
  }
  return { reservas, descartadas };
}

// POST /reservas. Recibe los datos YA validados por el formulario.
export async function crearReserva(datos) {
  const { aceptaCondiciones, ...reserva } = datos; // la casilla no se guarda
  const creada = await pedirJSON(`${API_URL}/reservas`, {
    method: 'POST',
    body: { ...reserva, creadaEn: new Date().toISOString() },
  });

  // Lo que devuelve el servidor también tiene que cumplir el esquema.
  const resultado = reservaSchema.safeParse(creada);
  if (!resultado.success) {
    throw new Error('El servidor ha guardado la reserva pero ha respondido con datos raros');
  }
  return resultado.data;
}

// DELETE /reservas/:id
export async function borrarReserva(id) {
  await pedirJSON(`${API_URL}/reservas/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return id;
}
