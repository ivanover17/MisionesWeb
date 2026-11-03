/**
 * Desplegable de destinos. Es un input CONTROLADO: el valor viene del padre
 * (`value`) y cada cambio se le comunica con `onChange`.
 * Recibe la petición de países entera para pintar sus estados.
 */
export default function AreaSelect({ request, value, onChange }) {
  const { status, data: areas, retry } = request;

  if (status === 'error') {
    return (
      <div className="field">
        <span>Destino</span>
        <button type="button" className="btn btn--ghost" onClick={retry}>
          ⚠️ No cargaron los países · Reintentar
        </button>
      </div>
    );
  }

  return (
    <label className="field">
      <span>Destino</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={status !== 'success' || areas.length === 0}
      >
        {status === 'success' ? (
          <>
            <option value="">Elige un destino…</option>
            {areas.map(({ area, country }) => (
              <option key={area} value={area}>
                {country} · {area}
              </option>
            ))}
          </>
        ) : (
          <option value="">Cargando países…</option>
        )}
      </select>
    </label>
  );
}
