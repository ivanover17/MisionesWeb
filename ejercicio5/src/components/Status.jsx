// Mensajes de estado reutilizables (cargando / error con reintento).

export function Cargando({ children = 'Cargando…' }) {
  return (
    <p className="estado estado--cargando" role="status">
      <span className="spinner" aria-hidden="true" /> {children}
    </p>
  );
}

export function MensajeError({ error, onReintentar }) {
  return (
    <div className="estado estado--error" role="alert">
      <p>{error?.message ?? 'Algo ha fallado'}</p>
      {onReintentar && (
        <button type="button" className="boton boton--secundario" onClick={() => onReintentar()}>
          Reintentar
        </button>
      )}
    </div>
  );
}
