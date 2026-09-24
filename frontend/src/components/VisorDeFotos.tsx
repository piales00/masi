import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/** Menos que esto es un roce, no un gesto de pasar de foto. */
const UMBRAL_DESLIZAMIENTO = 50;

/**
 * La foto a pantalla completa, encima de todo.
 *
 * Va por un portal a `document.body` a propósito: dentro del armazón quedaría dentro de
 * una columna con `overflow-hidden` y por debajo de la cápsula de navegación y del aviso
 * flotante. Colgando del `body` no hace falta tocar ninguna de las dos para que el visor
 * sea la capa de arriba.
 *
 * No pide nada: recibe las imágenes que la pantalla ya cargó. Aquí no hay red.
 */
export function VisorDeFotos({ fotos, inicial, etiqueta, onCerrar }: {
  fotos: readonly string[];
  /** Cuál se abre; el índice viene de la miniatura que se tocó. */
  inicial: number;
  /** Cierra la frase «Foto 2 de 4 …»: «del cliente», «de la solicitud», «del trabajo». */
  etiqueta: string;
  onCerrar: () => void;
}) {
  const [indice, setIndice] = useState(inicial);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  const inicioDelGesto = useRef<number | null>(null);

  const total = fotos.length;
  const actual = Math.min(indice, Math.max(total - 1, 0));

  useEffect(() => {
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrar.current();
      // Los topes son duros: en la primera no hay anterior y en la última no hay siguiente.
      if (evento.key === 'ArrowLeft') setIndice(previo => Math.max(0, previo - 1));
      if (evento.key === 'ArrowRight') setIndice(previo => Math.min(total - 1, previo + 1));
    };
    window.addEventListener('keydown', teclado);
    return () => { window.removeEventListener('keydown', teclado); };
  }, [total]);

  useEffect(() => {
    // Con el visor abierto, lo de detrás no se mueve. Se devuelve tal cual estaba.
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, []);

  if (total === 0) return null;

  const mover = (paso: number) => setIndice(previo => Math.min(total - 1, Math.max(0, previo + paso)));

  const empezarGesto = (evento: React.TouchEvent) => {
    inicioDelGesto.current = evento.touches[0]?.clientX ?? null;
  };

  const terminarGesto = (evento: React.TouchEvent) => {
    const desde = inicioDelGesto.current;
    inicioDelGesto.current = null;
    if (desde === null) return;
    const recorrido = (evento.changedTouches[0]?.clientX ?? desde) - desde;
    if (Math.abs(recorrido) < UMBRAL_DESLIZAMIENTO) return;
    // Arrastrar hacia la izquierda trae la siguiente, como pasar una página.
    mover(recorrido < 0 ? 1 : -1);
  };

  const control = 'grid size-11 place-items-center rounded-full bg-white/15 text-white transition-colors duration-200 ease-out hover:bg-white/25 disabled:opacity-30';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${actual + 1} de ${total} ${etiqueta}`}
      className="fixed inset-0 z-50 flex flex-col overscroll-contain bg-masi-navy/95 animate-masi-rise"
    >
      <div className="flex shrink-0 justify-end p-3 pt-[calc(0.75rem+var(--masi-safe-top))]">
        <button type="button" onClick={onCerrar} aria-label="Cerrar visor" className={control} autoFocus>
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 items-center justify-center px-3"
        onTouchStart={empezarGesto}
        onTouchEnd={terminarGesto}
      >
        <img
          key={actual}
          src={fotos[actual]}
          alt={`Foto ${actual + 1} ${etiqueta}`}
          className="max-h-full max-w-full object-contain animate-masi-rise"
        />
      </div>

      <div className="flex shrink-0 items-center justify-center gap-6 p-4 pb-[calc(1rem+var(--masi-safe-bottom))]">
        {total > 1 && <button
          type="button"
          onClick={() => mover(-1)}
          disabled={actual === 0}
          aria-label="Foto anterior"
          className={control}
        ><ChevronLeft size={22} aria-hidden="true" /></button>}

        <p className="text-sm font-semibold tabular-nums text-white">{actual + 1} / {total}</p>

        {total > 1 && <button
          type="button"
          onClick={() => mover(1)}
          disabled={actual === total - 1}
          aria-label="Foto siguiente"
          className={control}
        ><ChevronRight size={22} aria-hidden="true" /></button>}
      </div>
    </div>,
    document.body,
  );
}
