import { useEffect, useState, useSyncExternalStore } from 'react';
import { addressOfProvider, useDemo } from '../demo/DemoContext';
import type { ProviderProfile } from '../demo/DemoContext';
import type { Job } from '../../../shared/escrow';
import { escrow } from '.';
import { trabajosPorAtender } from './jobs';

/**
 * La dirección con la que el profesional aparece dentro de un trabajo. La cuenta con
 * passkey trae `contractId`; los profesionales del catálogo, la dirección de su ficha.
 */
export function direccionDelProfesional(perfil: ProviderProfile | null): string | null {
  if (!perfil) return null;
  return perfil.contractId ?? addressOfProvider(perfil.id) ?? perfil.id;
}

/**
 * Los trabajos viven en el gateway, no en React, así que cuando una acción cambia uno
 * hay que avisar a quien los esté mostrando: la pantalla del trabajo, la lista de
 * Solicitudes y el badge. Un contador basta; nadie guarda copia del trabajo.
 */
let revision = 0;
const oyentes = new Set<() => void>();

export function notificarCambioDeTrabajos(): void {
  revision += 1;
  for (const avisar of oyentes) avisar();
}

function suscribir(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => { oyentes.delete(avisar); };
}

export function useRevisionDeTrabajos(): number {
  return useSyncExternalStore(suscribir, () => revision, () => revision);
}

/**
 * Los trabajos de una dirección, con la señal de si ya se leyeron.
 *
 * `listos` importa tanto como la lista: mientras es `false` no se sabe nada de los
 * trabajos de esa dirección, y una pantalla no puede dar por hecho el estado de ninguno.
 * La lectura queda marcada con la dirección a la que pertenece, así que al cambiar de
 * profesional vuelve a ser `false` en vez de enseñar lo del anterior.
 */
export function useTrabajosDe(address: string | null): { jobs: Job[]; listos: boolean } {
  const { cotizaciones } = useDemo();
  const revision = useRevisionDeTrabajos();
  const [lectura, setLectura] = useState<{ address: string | null; jobs: Job[] }>({ address: null, jobs: [] });

  useEffect(() => {
    let vigente = true;
    if (!address) {
      setLectura({ address: null, jobs: [] });
      return;
    }
    (async () => {
      try {
        const encontrados = await escrow.jobsOf(address);
        if (vigente) setLectura({ address, jobs: encontrados });
      } catch {
        // Un fallo al releer conserva lo último leído de esta misma dirección; de otra
        // no se hereda nada, que sería enseñar los trabajos de quien ya no está.
        if (vigente) setLectura(actual => ({ address, jobs: actual.address === address ? actual.jobs : [] }));
      }
    })();
    return () => { vigente = false; };
  }, [address, cotizaciones, revision]);

  const listos = lectura.address === address;
  return { jobs: listos ? lectura.jobs : [], listos };
}

/**
 * Los trabajos de una dirección, para pintarlos. Devuelve una lista vacía mientras carga,
 * así que solo vale para quien pueda mostrar su pantalla sin el estado todavía resuelto;
 * si de eso depende lo que se afirma en pantalla, se usa `useTrabajosDe`.
 */
export function useJobsDe(address: string | null): Job[] {
  return useTrabajosDe(address).jobs;
}

/**
 * Cuántos trabajos esperan una acción de cada rol. Es lo que cuenta el badge de
 * Solicitudes: trabajos activos cuya siguiente acción es de esa persona, nada de
 * leído/no leído. Se relee cuando cambian las cotizaciones, que es lo que crea trabajos.
 */
export function useJobsPorAtender(): { client: number; provider: number } {
  const { clienteId, providerProfile, cotizaciones } = useDemo();
  const revision = useRevisionDeTrabajos();
  const [counts, setCounts] = useState({ client: 0, provider: 0 });
  const direccionProfesional = direccionDelProfesional(providerProfile);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const [deCliente, deProfesional] = await Promise.all([
          clienteId ? escrow.jobsOf(clienteId) : Promise.resolve([]),
          direccionProfesional ? escrow.jobsOf(direccionProfesional) : Promise.resolve([]),
        ]);
        if (!vigente) return;
        setCounts({
          client: trabajosPorAtender(deCliente, 'client').length,
          provider: trabajosPorAtender(deProfesional, 'provider').length,
        });
      } catch {
        // El badge es informativo: si no se puede leer, se queda como está.
      }
    })();
    return () => { vigente = false; };
  }, [clienteId, direccionProfesional, cotizaciones, revision]);

  return counts;
}
