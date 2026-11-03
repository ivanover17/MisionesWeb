import { useState } from 'react';
import { FALLBACK_IMAGE } from '../logic/meals.js';

/**
 * <img> que, si la foto falla, enseña el plato vacío.
 * En la M2 esto era un addEventListener('error') sobre el DOM; aquí es estado.
 * Guardo QUÉ url falló (no un simple true/false): si cambia `src`, el valor
 * deja de coincidir y se vuelve a intentar sin necesidad de ningún efecto.
 */
export default function SafeImage({ src, alt = '', ...rest }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const shown = failedSrc === src ? FALLBACK_IMAGE : src;

  return <img src={shown} alt={alt} onError={() => setFailedSrc(src)} {...rest} />;
}
