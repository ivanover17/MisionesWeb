// Envoltorio de un campo: etiqueta, el control (children), una ayuda opcional y el error.
// El input recibe los atributos de accesibilidad con la función `a11y` de abajo.

export function idsDe(nombre) {
  return { error: `${nombre}-error`, ayuda: `${nombre}-ayuda` };
}

// Atributos para que un lector de pantalla sepa que el campo es inválido y lea el error.
export function a11y(nombre, error, conAyuda = false) {
  const ids = idsDe(nombre);
  const describedBy = [conAyuda && ids.ayuda, error && ids.error].filter(Boolean).join(' ');
  return {
    id: nombre,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  };
}

export default function Campo({ nombre, etiqueta, error, ayuda, children, className = '' }) {
  const ids = idsDe(nombre);
  return (
    <div className={`campo ${error ? 'campo--error' : ''} ${className}`}>
      {etiqueta && <label htmlFor={nombre}>{etiqueta}</label>}
      {children}
      {ayuda && (
        <p className="campo__ayuda" id={ids.ayuda}>
          {ayuda}
        </p>
      )}
      {error && (
        <p className="campo__error" id={ids.error} role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
