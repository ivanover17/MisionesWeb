import { useState } from 'react';
import { fechaLegible } from '../lib/fechas.js';
import { useAreas, useBorrarReserva, useReservas } from '../queries/reservas.js';
import { ALERGIAS, TURNOS } from '../schemas/reserva.js';
import { Cargando, MensajeError } from './Status.jsx';

const nombreAlergia = Object.fromEntries(ALERGIAS.map((a) => [a.value, a.label]));
const nombreTurno = Object.fromEntries(TURNOS.map((t) => [t.value, t.label]));

export default function ReservasList() {
  // El filtro solo lo usa esta lista, así que es estado local.
  const [area, setArea] = useState('');
  const reservas = useReservas(area);
  const areas = useAreas(); // misma query que el formulario: sale de la caché, no hay segunda petición

  return (
    <section className="tarjeta lista" aria-labelledby="titulo-lista" aria-busy={reservas.isFetching}>
      <div className="lista__cabecera">
        <h2 id="titulo-lista">Reservas</h2>
        {reservas.isFetching && !reservas.isPending && <span className="actualizando">Actualizando…</span>}
      </div>

      <label className="filtro">
        Ver solo
        <select value={area} onChange={(e) => setArea(e.target.value)} disabled={!areas.data}>
          <option value="">Todos los países</option>
          {areas.data?.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <Contenido consulta={reservas} area={area} />
    </section>
  );
}

function Contenido({ consulta, area }) {
  if (consulta.isPending) return <Cargando>Cargando reservas…</Cargando>;
  if (consulta.isError) return <MensajeError error={consulta.error} onReintentar={consulta.refetch} />;

  const { reservas, descartadas } = consulta.data;
  return (
    <>
      {descartadas.length > 0 && <AvisoDescartadas descartadas={descartadas} />}

      {reservas.length === 0 ? (
        <p className="estado">
          {area ? `Todavía no hay reservas para la cena de ${area}.` : 'Todavía no hay reservas. ¡Sé el primero!'}
        </p>
      ) : (
        <ul className={`reservas ${consulta.isPlaceholderData ? 'reservas--antiguas' : ''}`}>
          {reservas.map((r) => (
            <ReservaItem key={r.id} reserva={r} />
          ))}
        </ul>
      )}
    </>
  );
}

function ReservaItem({ reserva }) {
  const borrar = useBorrarReserva(); // un hook por tarjeta: cada una sabe si se está borrando ella
  const [confirmando, setConfirmando] = useState(false);
  const adultos = reserva.comensales - reserva.ninos;

  return (
    <li className="reserva">
      <div className="reserva__sello" aria-hidden="true">
        {reserva.area.slice(0, 2).toUpperCase()}
      </div>
      <div className="reserva__datos">
        <h3>
          Cena de {reserva.area} <span className="reserva__turno">· {nombreTurno[reserva.turno]}</span>
        </h3>
        <p className="reserva__fecha">{fechaLegible(reserva.fecha)}</p>
        <p>
          {reserva.nombre} · {adultos} {adultos === 1 ? 'adulto' : 'adultos'}
          {reserva.ninos > 0 && ` y ${reserva.ninos} ${reserva.ninos === 1 ? 'niño' : 'niños'}`}
        </p>
        {reserva.alergias.length > 0 && (
          <p className="reserva__alergias">
            ⚠️ {reserva.alergias.map((a) => (a === 'otra' ? reserva.detalleAlergia || 'otra' : nombreAlergia[a])).join(', ')}
          </p>
        )}
        {reserva.comentario && <p className="reserva__comentario">«{reserva.comentario}»</p>}
        {borrar.isError && (
          <p className="campo__error" role="alert">
            No se ha podido cancelar: {borrar.error.message}
          </p>
        )}
      </div>

      <div className="reserva__acciones">
        {borrar.isPending ? (
          <span className="actualizando">Cancelando…</span>
        ) : confirmando ? (
          <>
            <button
              type="button"
              className="boton boton--peligro"
              onClick={() => borrar.mutate(reserva.id, { onSettled: () => setConfirmando(false) })}
            >
              Sí, cancelar
            </button>
            <button type="button" className="boton boton--enlace" onClick={() => setConfirmando(false)}>
              No
            </button>
          </>
        ) : (
          <button type="button" className="boton boton--secundario" onClick={() => setConfirmando(true)}>
            Cancelar reserva
          </button>
        )}
      </div>
    </li>
  );
}

// Reto bonus: lo que el API devuelve y no cumple el esquema se enseña aquí en vez de pintarse.
function AvisoDescartadas({ descartadas }) {
  return (
    <details className="aviso aviso--atencion">
      <summary>
        {descartadas.length === 1
          ? '1 reserva del servidor no cumple el esquema y se ha descartado'
          : `${descartadas.length} reservas del servidor no cumplen el esquema y se han descartado`}
      </summary>
      <ul>
        {descartadas.map((d) => (
          <li key={d.id}>
            <strong>Reserva {d.id}:</strong>
            <ul>
              {d.problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}
