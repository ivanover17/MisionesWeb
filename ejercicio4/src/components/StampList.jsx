import { initials } from '../logic/meals.js';

/**
 * Inclinación del sello calculada a partir del nombre, no de la posición:
 * así cada país tiene siempre la misma aunque los sellos se reordenen.
 */
const tiltOf = (area) =>
  ([...area].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 17) - 8;

function Stamp({ stamp, active, onSelect }) {
  return (
    <button
      type="button"
      className={`stamp ${active ? 'stamp--active' : ''}`}
      style={{ '--tilt': `${tiltOf(stamp.area)}deg` }}
      title={`Volver a ${stamp.country}`}
      aria-pressed={active}
      onClick={() => onSelect(stamp.area)}
    >
      <span className="stamp__code">{initials(stamp.country)}</span>
      <span className="stamp__name">{stamp.country}</span>
    </button>
  );
}

export default function StampList({ stamps, activeArea, onSelect }) {
  return (
    <section aria-labelledby="stamps-title" className="passport">
      <h2 id="stamps-title" className="section-title">
        Mis sellos {stamps.length > 0 && <small>({stamps.length})</small>}
      </h2>

      {stamps.length === 0 ? (
        <p className="stamps__empty">Aún no tienes sellos. ¡Elige tu primer destino!</p>
      ) : (
        <div className="stamps">
          {stamps.map((stamp) => (
            <Stamp
              key={stamp.area}
              stamp={stamp}
              active={stamp.area === activeArea}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
