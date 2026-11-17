import { z } from 'zod';
import { diaDeLaSemana, hoyISO, sumarDias } from '../lib/fechas.js';

/**
 * Única fuente de verdad de la validación.
 *
 * - `datosReserva`: cómo es una reserva (tipos y formatos). Lo comparten el
 *   formulario y la respuesta del API.
 * - `reservaFormSchema`: lo que se valida en el formulario. Añade la casilla de
 *   condiciones, las reglas de la fecha (futura, máx. 90 días, lunes cerrado) y
 *   las reglas que cruzan varios campos (domingos solo comida, al menos un
 *   adulto, detalle si la alergia es «otra»).
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

// La fecha de una reserva NUEVA: además del formato, reglas del restaurante.
// (Una reserva guardada puede ser de ayer, por eso esto no está en datosReserva.)
const fechaReservable = datosReserva.shape.fecha
  .refine((f) => f > hoyISO(), { error: 'Reserva al menos con un día de antelación' })
  .refine((f) => f <= sumarDias(hoyISO(), DIAS_MAXIMOS_ANTELACION), {
    error: `Solo aceptamos reservas para los próximos ${DIAS_MAXIMOS_ANTELACION} días`,
  })
  .refine((f) => diaDeLaSemana(f) !== 1, { error: 'Los lunes el restaurante está cerrado' });

const camposFormulario = datosReserva.extend({
  fecha: fechaReservable,
  aceptaCondiciones: z.literal(true, { error: 'Tienes que aceptar las condiciones de la reserva' }),
});

// Por defecto, Zod no ejecuta los refine del objeto si algún campo ya tiene un error
// (por ejemplo, si falta la casilla de condiciones). Con `when` cada regla cruzada se
// comprueba en cuanto SUS campos son válidos, así el usuario ve todos los errores a la vez.
const cuandoSonValidos =
  (...campos) =>
  (payload) =>
    camposFormulario.pick(Object.fromEntries(campos.map((c) => [c, true]))).safeParse(payload.value).success;

export const reservaFormSchema = camposFormulario
  .refine((d) => !(diaDeLaSemana(d.fecha) === 0 && d.turno === 'cena'), {
    path: ['turno'],
    error: 'Los domingos solo abrimos para comer',
    when: cuandoSonValidos('fecha', 'turno'),
  })
  .refine((d) => d.ninos < d.comensales, {
    path: ['ninos'],
    error: 'Tiene que venir al menos un adulto',
    when: cuandoSonValidos('comensales', 'ninos'),
  })
  .refine((d) => !d.alergias.includes('otra') || d.detalleAlergia !== '', {
    path: ['detalleAlergia'],
    error: 'Cuéntanos qué otra alergia o intolerancia hay',
    when: cuandoSonValidos('alergias', 'detalleAlergia'),
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
