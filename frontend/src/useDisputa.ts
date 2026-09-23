import { useCallback, useEffect, useState } from 'react';
import type { Disputa, ParteEnDisputa } from '../../shared/api';
import { api } from './api/client';

/**
 * La disputa de un trabajo, con las fotos de cada parte.
 *
 * El contrato congela el saldo pero no guarda el porqué: las versiones viven en el
 * almacén compartido, y sin traerlas el árbitro repartiría a ciegas. Las imágenes se
 * piden aparte del registro, igual que las de una solicitud.
 */
export interface DisputaConPruebas {
  disputa: Disputa | null;
  fotos: Record<ParteEnDisputa, string[]>;
  cargando: boolean;
  recargar: () => void;
}

const SIN_FOTOS: Record<ParteEnDisputa, string[]> = { client: [], provider: [] };

export function useDisputa(jobId: string | undefined, activo = true): DisputaConPruebas {
  const [disputa, setDisputa] = useState<Disputa | null>(null);
  const [fotos, setFotos] = useState<Record<ParteEnDisputa, string[]>>(SIN_FOTOS);
  const [cargando, setCargando] = useState(false);
  const [intento, setIntento] = useState(0);
  const recargar = useCallback(() => setIntento(valor => valor + 1), []);

  useEffect(() => {
    if (!jobId || !activo) {
      setDisputa(null);
      setFotos(SIN_FOTOS);
      return;
    }
    let vigente = true;
    setCargando(true);
    (async () => {
      try {
        const leida = await api.getDisputa(jobId);
        if (!vigente) return;
        setDisputa(leida);
        // Solo se piden las fotos de quien declaró tener alguna.
        const conFotos = (leida?.descargos ?? []).filter(item => item.fotos > 0);
        const pares = await Promise.all(conFotos.map(async item => {
          try {
            return [item.parte, await api.fotosDescargo(jobId, item.parte)] as const;
          } catch {
            return [item.parte, []] as const;
          }
        }));
        if (vigente) setFotos({ ...SIN_FOTOS, ...Object.fromEntries(pares) });
      } catch {
        // Sin disputa legible la pantalla sigue viva; solo no muestra las versiones.
        if (vigente) { setDisputa(null); setFotos(SIN_FOTOS); }
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => { vigente = false; };
  }, [jobId, activo, intento]);

  return { disputa, fotos, cargando, recargar };
}
