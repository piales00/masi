import { useFotosDeSolicitud } from '../useFotosDeSolicitud';

/**
 * La rejilla de fotos de una solicitud, igual en las tres pantallas que las enseñan.
 *
 * Mientras cargan deja huecos grises del tamaño exacto de las miniaturas, tantos como
 * fotos haya: así la pantalla no da un salto cuando llegan. Si no llegan, una línea
 * discreta y nada más; lo demás de la pantalla sigue en pie.
 */
export function FotosDeSolicitud({ solicitudId, cantidad, etiqueta }: {
  solicitudId: string;
  cantidad: number;
  /** Cierra la frase «Foto 1 …»: «del cliente», «de la solicitud», «del trabajo». */
  etiqueta: string;
}) {
  const { fotos, cargando, error } = useFotosDeSolicitud(solicitudId, cantidad);

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

  return <ul className="mt-3 grid grid-cols-3 gap-2">
    {fotos.map((foto, index) => <li key={index}>
      <img
        src={foto}
        alt={`Foto ${index + 1} ${etiqueta}`}
        className="aspect-square w-full rounded-masi-input border border-masi-gray object-cover"
      />
    </li>)}
  </ul>;
}
