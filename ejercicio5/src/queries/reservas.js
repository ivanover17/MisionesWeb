import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAreas } from '../api/mealdb.js';
import { borrarReserva, crearReserva, getReservas } from '../api/reservas.js';

/**
 * Claves de las queries en un solo sitio (query key factory).
 *
 *   ['areas']                               → países de TheMealDB
 *   ['reservas']                            → raíz de todo lo de reservas
 *   ['reservas', 'lista', { area: '' }]     → la lista completa
 *   ['reservas', 'lista', { area: 'Thai' }] → la lista filtrada por un país
 *
 * Como todas las listas empiezan por ['reservas'], invalidar esa raíz
 * marca como caducadas TODAS las variantes filtradas de una vez.
 */
export const claves = {
  areas: ['areas'],
  reservas: ['reservas'],
  listaReservas: (area) => ['reservas', 'lista', { area }],
};

export function useAreas() {
  return useQuery({
    queryKey: claves.areas,
    queryFn: ({ signal }) => getAreas({ signal }),
    staleTime: Infinity, // la lista de países no cambia mientras usas la app
  });
}

export function useReservas(area) {
  return useQuery({
    queryKey: claves.listaReservas(area),
    queryFn: ({ signal }) => getReservas({ area, signal }),
    // Al cambiar de filtro se sigue viendo la lista anterior (atenuada) mientras llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export function useCrearReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearReserva,
    // Devuelvo la promesa: la mutación no se da por terminada hasta que la lista se ha recargado.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.reservas }),
  });
}

export function useBorrarReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: borrarReserva,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.reservas }),
  });
}
