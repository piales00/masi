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
 * Los trabajos de una dirección, para pintarlos. Devuelve una lista vacía mientras carga:
 * quien la use debe poder mostrar la tarjeta sin el estado todavía resuelto.
 */
export function useJobsDe(address: string | null): Job[] {
  const { cotizaciones } = useDemo();
  const revision = useRevisionDeTrabajos();
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    let vigente = true;
    if (!address) {
      setJobs([]);
      return;
    }
    (async () => {
      try {
        const encontrados = await escrow.jobsOf(address);
        if (vigente) setJobs(encontrados);
      } catch {
        // Sin trabajos legibles la pantalla sigue mostrando lo que viene de la demo.
      }
    })();
    return () => { vigente = false; };
  }, [address, cotizaciones, revision]);

  return jobs;
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
