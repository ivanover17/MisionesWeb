import { z } from 'zod';
import { diaDeLaSemana, hoyISO, sumarDias } from '../lib/fechas.js';

/**
 * Única fuente de verdad de la validación.
 *
 * - `datosReserva`: cómo es una reserva (tipos y formatos). Lo comparten el
 *   formulario y la respuesta del API.
 * - `reservaFormSchema`: lo que se valida al enviar el formulario. Añade la
 *   casilla de condiciones y las reglas del restaurante (fecha futura, lunes
 *   cerrado, al menos un adulto...).
 * - `reservaSchema`: una reserva tal como la devuelve el servidor (con id y
 *   fecha de creación). Sirve para el reto bonus: comprobar el API con safeParse.
 */

export const MAX_COMENSALES = 10;
export const DIAS_MAXIMOS_ANTELACION = 90;

export const TURNOS = [
  { value: 'comida', label: 'Comida (14:00)' },
  { value: 'cena', label: 'Cena (21:00)' },
];

export const ALERGIAS = [
  { value: 'gluten', label: 'Gluten' },
  { value: 'lactosa', label: 'Lactosa' },
  { value: 'frutos-secos', label: 'Frutos secos' },
  { value: 'marisco', label: 'Marisco' },
  { value: 'huevo', label: 'Huevo' },
  { value: 'otra', label: 'Otra' },
];

const valoresTurno = TURNOS.map((t) => t.value);
const valoresAlergia = ALERGIAS.map((a) => a.value);

// Un número entero que viene de un <input type="number"> registrado con valueAsNumber.
// Si el campo está vacío, React Hook Form da NaN, y Zod lo rechaza con este mensaje.
const entero = (mensajeVacio) =>
  z.number({ error: mensajeVacio }).int({ error: 'Tiene que ser un número entero' });

const datosReserva = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: 'Escribe tu nombre (mínimo 2 letras)' })
    .max(60, { error: 'Máximo 60 caracteres' })
    .regex(/^[\p{L}' -]+$/u, { error: 'Solo letras, espacios, guiones y apóstrofos' }),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: 'Ese email no parece válido' })),
  area: z.string().min(1, { error: 'Elige de qué país es la cena' }),
  fecha: z.iso.date({ error: 'Elige una fecha' }),
  turno: z.enum(valoresTurno, { error: 'Elige comida o cena' }),
  comensales: entero('¿Cuántos vais a ser?')
    .min(1, { error: 'Como mínimo, 1 persona' })
    .max(MAX_COMENSALES, { error: `Para más de ${MAX_COMENSALES} personas, llámanos` }),
  ninos: entero('Pon 0 si no vienen niños').min(0, { error: 'No puede ser negativo' }),
  alergias: z.array(z.enum(valoresAlergia)),
  detalleAlergia: z.string().trim().max(120, { error: 'Máximo 120 caracteres' }).default(''),
  comentario: z.string().trim().max(300, { error: 'Máximo 300 caracteres' }).default(''),
});

export const reservaFormSchema = datosReserva
  .extend({
    aceptaCondiciones: z.literal(true, { error: 'Tienes que aceptar las condiciones de la reserva' }),
  })
  .superRefine((datos, ctx) => {
    const hoy = hoyISO();
    const limite = sumarDias(hoy, DIAS_MAXIMOS_ANTELACION);

    if (datos.fecha <= hoy) {
      ctx.addIssue({ code: 'custom', path: ['fecha'], message: 'Reserva al menos con un día de antelación' });
    } else if (datos.fecha > limite) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha'],
        message: `Solo aceptamos reservas para los próximos ${DIAS_MAXIMOS_ANTELACION} días`,
      });
    } else if (diaDeLaSemana(datos.fecha) === 1) {
      ctx.addIssue({ code: 'custom', path: ['fecha'], message: 'Los lunes el restaurante está cerrado' });
    } else if (diaDeLaSemana(datos.fecha) === 0 && datos.turno === 'cena') {
      ctx.addIssue({ code: 'custom', path: ['turno'], message: 'Los domingos solo abrimos para comer' });
    }

    if (datos.ninos >= datos.comensales) {
      ctx.addIssue({ code: 'custom', path: ['ninos'], message: 'Tiene que venir al menos un adulto' });
    }

    if (datos.alergias.includes('otra') && datos.detalleAlergia === '') {
      ctx.addIssue({ code: 'custom', path: ['detalleAlergia'], message: 'Cuéntanos qué otra alergia o intolerancia hay' });
    }
  });

// Valores con los que arranca el formulario (todos los campos registrados tienen uno).
export const valoresIniciales = {
  nombre: '',
  email: '',
  area: '',
  fecha: '',
  turno: 'cena',
  comensales: 2,
  ninos: 0,
  alergias: [],
  detalleAlergia: '',
  comentario: '',
  aceptaCondiciones: false,
};

// ---------- Respuestas del API (reto bonus) ----------

export const reservaSchema = datosReserva.extend({
  id: z.union([z.number(), z.string()]),
  creadaEn: z.iso.datetime({ error: 'creadaEn no es una fecha ISO' }),
});

// TheMealDB: GET list.php?a=list → { meals: [{ strArea: 'Spanish' }, ...] }
export const areasRespuestaSchema = z.object({
  meals: z.array(z.object({ strArea: z.string().min(1) })),
});
