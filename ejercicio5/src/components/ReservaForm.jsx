import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { fechaLegible, hoyISO, sumarDias } from '../lib/fechas.js';
import { useAreas, useCrearReserva } from '../queries/reservas.js';
import {
  ALERGIAS,
  DIAS_MAXIMOS_ANTELACION,
  MAX_COMENSALES,
  TURNOS,
  reservaFormSchema,
  valoresIniciales,
} from '../schemas/reserva.js';
import Campo, { a11y } from './Campo.jsx';
import { MensajeError } from './Status.jsx';

export default function ReservaForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(reservaFormSchema),
    defaultValues: valoresIniciales,
    mode: 'onTouched', // valida un campo al salir de él y, después, mientras se corrige
  });

  const areas = useAreas();
  const crear = useCrearReserva();
  const [confirmada, setConfirmada] = useState(null);

  // Solo vuelven a renderizar este componente los campos que miro aquí.
  const alergias = useWatch({ control, name: 'alergias' });
  const comentario = useWatch({ control, name: 'comentario' });
  const hayOtraAlergia = alergias?.includes('otra');

  const hoy = hoyISO();
  const numErrores = Object.keys(errors).filter((k) => k !== 'root').length;

  // handleSubmit solo llama a esto si Zod da el visto bueno; `datos` ya viene limpio
  // (con trim, email en minúsculas y números de verdad).
  function onSubmit(datos) {
    setConfirmada(null);
    const reserva = { ...datos, detalleAlergia: datos.alergias.includes('otra') ? datos.detalleAlergia : '' };
    crear.mutate(reserva, {
      onSuccess: (creada) => {
        setConfirmada(creada);
        reset();
      },
      onError: (error) => setError('root.servidor', { message: error.message }),
    });
  }

  return (
    <form className="tarjeta formulario" onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="titulo-form">
      <h2 id="titulo-form">Reserva tu cena</h2>
      <p className="formulario__intro">
        Cada noche cocinamos la receta de un país. Elige cuál y te guardamos mesa.
      </p>

      {isSubmitted && numErrores > 0 && (
        <p className="aviso aviso--error" role="alert">
          Revisa {numErrores === 1 ? 'el campo marcado' : `los ${numErrores} campos marcados`} en rojo.
        </p>
      )}

      <fieldset>
        <legend>¿Quién reserva?</legend>
        <Campo nombre="nombre" etiqueta="Nombre" error={errors.nombre}>
          <input type="text" autoComplete="name" {...a11y('nombre', errors.nombre)} {...register('nombre')} />
        </Campo>

        <Campo nombre="email" etiqueta="Email" error={errors.email} ayuda="Te mandaremos la confirmación aquí.">
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            {...a11y('email', errors.email, true)}
            {...register('email')}
          />
        </Campo>
      </fieldset>

      <fieldset>
        <legend>La cena</legend>
        <Campo nombre="area" etiqueta="País de la cena" error={errors.area}>
          <select disabled={areas.isPending || areas.isError} {...a11y('area', errors.area)} {...register('area')}>
            <option value="">
              {areas.isPending ? 'Cargando países…' : areas.isError ? 'No se han podido cargar' : 'Elige un país'}
            </option>
            {areas.data?.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </Campo>
        {areas.isError && <MensajeError error={areas.error} onReintentar={areas.refetch} />}

        <div className="fila">
          <Campo
            nombre="fecha"
            etiqueta="Fecha"
            error={errors.fecha}
            ayuda={`Cerramos los lunes. Hasta ${DIAS_MAXIMOS_ANTELACION} días vista.`}
          >
            <input
              type="date"
              min={sumarDias(hoy, 1)}
              max={sumarDias(hoy, DIAS_MAXIMOS_ANTELACION)}
              {...a11y('fecha', errors.fecha, true)}
              {...register('fecha')}
            />
          </Campo>

          <Campo nombre="turno" etiqueta="Turno" error={errors.turno}>
            <select {...a11y('turno', errors.turno)} {...register('turno')}>
              {TURNOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="fila">
          <Campo nombre="comensales" etiqueta="Comensales" error={errors.comensales}>
            <input
              type="number"
              min={1}
              max={MAX_COMENSALES}
              inputMode="numeric"
              {...a11y('comensales', errors.comensales)}
              {...register('comensales', { valueAsNumber: true })}
            />
          </Campo>

          <Campo nombre="ninos" etiqueta="De ellos, niños" error={errors.ninos}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              {...a11y('ninos', errors.ninos)}
              {...register('ninos', { valueAsNumber: true })}
            />
          </Campo>
        </div>
      </fieldset>

      <fieldset>
        <legend>Alergias e intolerancias</legend>
        <div className="checks">
          {ALERGIAS.map((a) => (
            <label key={a.value} className="check">
              <input type="checkbox" value={a.value} {...register('alergias')} />
              {a.label}
            </label>
          ))}
        </div>

        {hayOtraAlergia && (
          <Campo nombre="detalleAlergia" etiqueta="¿Cuál?" error={errors.detalleAlergia}>
            <input type="text" {...a11y('detalleAlergia', errors.detalleAlergia)} {...register('detalleAlergia')} />
          </Campo>
        )}

        <Campo
          nombre="comentario"
          etiqueta="Comentario (opcional)"
          error={errors.comentario}
          ayuda={`${comentario?.length ?? 0}/300`}
        >
          <textarea rows={3} {...a11y('comentario', errors.comentario, true)} {...register('comentario')} />
        </Campo>
      </fieldset>

      <Campo nombre="aceptaCondiciones" error={errors.aceptaCondiciones} className="campo--check">
        <label className="check">
          <input type="checkbox" {...a11y('aceptaCondiciones', errors.aceptaCondiciones)} {...register('aceptaCondiciones')} />
          Acepto que si no aviso con 24 h de antelación se cobran 10 € por persona.
        </label>
      </Campo>

      {errors.root?.servidor && (
        <p className="aviso aviso--error" role="alert">
          No se ha podido guardar la reserva: {errors.root.servidor.message}
        </p>
      )}

      <button type="submit" className="boton" disabled={crear.isPending}>
        {crear.isPending ? 'Reservando…' : 'Reservar mesa'}
      </button>

      <div aria-live="polite">
        {confirmada && (
          <div className="aviso aviso--exito">
            <p>
              <strong>¡Mesa reservada, {confirmada.nombre}!</strong> Cena de {confirmada.area} el{' '}
              {fechaLegible(confirmada.fecha)} para {confirmada.comensales}. Te hemos escrito a {confirmada.email}.
            </p>
            <button type="button" className="boton boton--enlace" onClick={() => setConfirmada(null)}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
