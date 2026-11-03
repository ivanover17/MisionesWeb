import AreaSelect from './AreaSelect.jsx';

/**
 * Cabecera con los controles. No guarda estado propio: todo llega por props
 * y los cambios suben al padre con callbacks (onAreaChange, onQueryChange…).
 */
export default function Header({ areasRequest, area, onAreaChange, query, onQueryChange, onRandom }) {
  return (
    <header className="hero">
      <p className="hero__kicker">Documento de viaje · Nº 003</p>
      <h1>
        Pasaporte <span>Gastronómico</span>
      </h1>
      <p className="hero__lead">Elige un país, colecciona su sello y descubre qué se cocina allí.</p>

      <div className="controls">
        <AreaSelect request={areasRequest} value={area} onChange={onAreaChange} />

        <label className="field">
          <span>{area ? 'Filtrar platos o ingredientes' : 'Buscar en todo el mundo'}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="p. ej. chicken, pasta, garlic…"
            autoComplete="off"
          />
        </label>

        <button type="button" className="btn btn--accent" onClick={onRandom}>
          🎲 Sorpréndeme
        </button>
      </div>
    </header>
  );
}
