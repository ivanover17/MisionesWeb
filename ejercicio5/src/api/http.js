// fetch + JSON con errores claros. No sabe nada de React ni de TanStack Query.

export class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function pedirJSON(url, { method = 'GET', body, signal } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Si TanStack Query cancela la petición, dejamos pasar el AbortError tal cual.
    if (error.name === 'AbortError') throw error;
    throw new Error('No hay conexión con el servidor. ¿Está arrancado (npm run dev)?');
  }

  if (!respuesta.ok) {
    throw new HttpError(respuesta.status, `El servidor ha respondido ${respuesta.status} (${respuesta.statusText || 'error'})`);
  }

  // DELETE en json-server devuelve {}; un 204 no trae cuerpo.
  if (respuesta.status === 204) return null;
  return respuesta.json();
}
