import { useEffect, useState } from 'react';
import type { Resena } from '../../shared/api';
import { store } from './demo/store';

/**
 * Los comentarios que los clientes dejaron sobre un profesional.
 *
 * Las estrellas y el número de valoraciones vienen del contrato, por `useProviderRating`:
 * esto **no** es una segunda fuente de reputación, solo el texto que acompaña a esa nota
 * y que la cadena no guarda. De dónde sale lo decide `store`, igual que el resto: en
 * local, las reseñas de este navegador; en modo API, el almacén compartido.
 */
export function useResenasDeProfesional(
  profesional: { providerId?: string; providerAddress?: string | null },
): { resenas: Resena[]; cargando: boolean; error: boolean } {
  const { providerId, providerAddress } = profesional;
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Sin a quién buscar no se pregunta nada.
    if (!providerId && !providerAddress) {
      setResenas([]);
      setCargando(false);
      setError(false);
      return;
    }

    let vigente = true;
    setCargando(true);
    setError(false);
    void store.leerResenasDe({ providerId, providerAddress })
      .then(encontradas => {
        if (!vigente) return;
        // De la más reciente a la más antigua, que es como se leen las opiniones.
        setResenas([...encontradas].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)));
      })
      .catch(() => {
        // Un fallo aquí no puede tumbar el perfil: la reputación y la propuesta siguen.
        if (vigente) setError(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => { vigente = false; };
  }, [providerId, providerAddress]);

  return { resenas, cargando, error };
}
