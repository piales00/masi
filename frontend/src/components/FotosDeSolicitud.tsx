import { useState } from 'react';
import { useFotosDeSolicitud } from '../useFotosDeSolicitud';
import { VisorDeFotos } from './VisorDeFotos';

/**
 * La rejilla de fotos de una solicitud, igual en las tres pantallas que las enseñan.
 *
 * Mientras cargan deja huecos grises del tamaño exacto de las miniaturas, tantos como
 * fotos haya: así la pantalla no da un salto cuando llegan. Si no llegan, una línea
 * discreta y nada más; lo demás de la pantalla sigue en pie.
 *
 * Al tocar una miniatura se abre el visor con esas mismas imágenes, las que ya están en
 * memoria: abrirlo no cuesta ni una petición más.
 */
export function FotosDeSolicitud({ solicitudId, cantidad, etiqueta }: {
  solicitudId: string;
  cantidad: number;
  /** Cierra la frase «Foto 1 …»: «del cliente», «de la solicitud», «del trabajo». */
  etiqueta: string;
}) {
  const { fotos, cargando, error } = useFotosDeSolicitud(solicitudId, cantidad);
  /** Índice de la foto abierta en el visor; `null` cuando está cerrado. */
  const [ampliada, setAmpliada] = useState<number | null>(null);

  if (cantidad <= 0) return null;

  if (cargando) return <ul aria-hidden="true" className="mt-3 grid grid-cols-3 gap-2">
    {Array.from({ length: cantidad }, (_, index) => <li
      key={index}
      className="aspect-square w-full animate-pulse rounded-masi-input bg-masi-gray"
    />)}
  </ul>;

  if (error || fotos.length === 0) {
    return <p className="mt-3 text-sm text-masi-muted">No pudimos cargar las fotos.</p>;
  }

  return <>
    <ul className="mt-3 grid grid-cols-3 gap-2">
      {fotos.map((foto, index) => <li key={index}>
        <button
          type="button"
          onClick={() => setAmpliada(index)}
          aria-label={`Ver foto ${index + 1} ${etiqueta}`}
          className="block w-full rounded-masi-input transition-opacity duration-200 ease-out hover:opacity-90"
        >
          <img
            src={foto}
            alt={`Foto ${index + 1} ${etiqueta}`}
            className="aspect-square w-full rounded-masi-input border border-masi-gray object-cover"
          />
        </button>
      </li>)}
    </ul>

    {ampliada !== null && <VisorDeFotos
      fotos={fotos}
      inicial={ampliada}
      etiqueta={etiqueta}
      onCerrar={() => setAmpliada(null)}
    />}
  </>;
}
