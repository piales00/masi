import { useEffect, useState } from 'react';
import { store } from './demo/store';

/**
 * Las imágenes de una solicitud, pedidas al abrirla.
 *
 * El listado solo trae cuántas son: traer las data URL en cada relectura (cada pocos
 * segundos, en modo API) sería mover megas para nada. Por eso las fotos se piden aquí,
 * una sola vez por solicitud abierta, y con `cantidad` en 0 no se pide nada: una
 * solicitud sin fotos no gasta una petición en descubrirlo.
 */
export function useFotosDeSolicitud(
  solicitudId: string | undefined,
  cantidad: number,
): { fotos: string[]; cargando: boolean; error: boolean } {
  const [fotos, setFotos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Lo primero es soltar las de la solicitud anterior: nunca se enseñan fotos ajenas.
    setFotos([]);
    setError(false);
    if (!solicitudId || cantidad <= 0) {
      setCargando(false);
      return;
    }

    let vigente = true;
    setCargando(true);
    void store.leerFotos(solicitudId)
      .then(encontradas => {
        if (vigente) setFotos(encontradas);
      })
      .catch(() => {
        // Que fallen las fotos no puede dejar la pantalla inservible: el resto sigue.
        if (vigente) setError(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => { vigente = false; };
  }, [solicitudId, cantidad]);

  return { fotos, cargando, error };
}
