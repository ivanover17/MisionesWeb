import { useEffect, useRef } from 'react';

/**
 * Ventana modal con el <dialog> nativo del navegador.
 *
 * Es un componente controlado: el padre decide si está abierta con `open`.
 * El <dialog> solo se puede abrir como modal llamando a showModal() (no hay
 * atributo para eso), así que un useEffect sincroniza la prop `open` con el
 * DOM. Para eso es el ref: acceder al elemento real.
 *
 * Si se cierra con Escape, el navegador lanza el evento "close" y lo
 * comunicamos al padre con onClose para que su estado no se quede desfasado.
 */
export default function Modal({ open, onClose, labelledBy, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClick(event) {
    // Clic en el fondo oscuro: el target es el propio <dialog>, no su contenido.
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={handleClick}
    >
      <button type="button" className="dialog__close" aria-label="Cerrar" onClick={onClose}>
        ✕
      </button>
      {/* El contenido solo se monta con la modal abierta: al cerrarla se
          desmonta y sus peticiones en curso se cancelan en el cleanup. */}
      {open && children}
    </dialog>
  );
}
