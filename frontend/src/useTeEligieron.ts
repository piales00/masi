import { useEffect, useRef, useState } from 'react';
import { useDemo } from './demo/DemoContext';
import { cotizacionesPorEnviar } from './demo/selectors';
import type { Trade } from './marketplace';

/** Cuánto se queda el aviso en pantalla antes de irse solo. No caduca nada. */
export const DURACION_AVISO_ELEGIDO_MS = 10_000;

/** Más de tres en espera dejaría de ser un aviso. */
const MAX_EN_COLA = 3;

/**
 * Cajón propio, separado del de las novedades: son dos eventos distintos y no deben
 * pisarse la memoria. Vive en la pestaña, así que ni un remontaje ni una recarga
 * convierten en «nuevo» algo que la persona ya vio.
 */
const CLAVE_VISTOS = 'masi.avisos.elegido.v1';
const MAX_VISTOS = 200;

export interface Eleccion {
  solicitudId: string;
  servicio: Trade;
  distrito: string;
  /** Pantalla existente para este momento: la cotización final de esa solicitud. */
  destino: string;
}

/** `null` cuando esta pestaña todavía no tiene línea base. */
function leerVistos(): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(CLAVE_VISTOS);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? new Set(value.filter((item): item is string => typeof item === 'string')) : null;
  } catch {
    return null;
  }
}

function guardarVistos(vistos: Set<string>): void {
  try {
    sessionStorage.setItem(CLAVE_VISTOS, JSON.stringify([...vistos].slice(-MAX_VISTOS)));
  } catch {
    // Sin almacenamiento la memoria dura lo que dure el montaje; el aviso no se repite igual.
  }
}

/**
 * Avisa cuando el cliente acaba de elegir la propuesta de este profesional.
 *
 * No hay evento nuevo ni endpoint nuevo: la elección ya está en los datos que sincroniza
 * la app, y se lee con `cotizacionesPorEnviar`, el mismo selector que alimenta el badge
 * de Solicitudes. Así el aviso y el contador nunca pueden decir cosas distintas.
 *
 * Lo que ya estaba elegido al entrar no avisa: la primera vuelta con datos apunta todo y
 * sale. A partir de ahí solo sorprende lo que aparece durante la sesión, y cada id queda
 * apuntado en cuanto se ve, así que no vuelve por un render, una navegación ni otra
 * vuelta del polling.
 */
export function useTeEligieron(): { eleccion: Eleccion | null; cerrar: () => void } {
  const { providerProfile, solicitudes, postulaciones, cotizaciones, cargando } = useDemo();
  const memoria = useRef<{ vistos: Set<string>; conLineaBase: boolean } | null>(null);
  if (memoria.current === null) {
    const guardados = leerVistos();
    memoria.current = { vistos: guardados ?? new Set(), conLineaBase: guardados !== null };
  }
  const [cola, setCola] = useState<Eleccion[]>([]);

  useEffect(() => {
    if (cargando) return;

    const { vistos, conLineaBase } = memoria.current!;
    const nuevas: Eleccion[] = [];

    for (const solicitud of cotizacionesPorEnviar(providerProfile, solicitudes, postulaciones, cotizaciones)) {
      if (vistos.has(solicitud.id)) continue;
      vistos.add(solicitud.id);
      nuevas.push({
        solicitudId: solicitud.id,
        servicio: solicitud.servicio,
        distrito: solicitud.distrito,
        destino: `/profesional/cotizacion/${solicitud.id}`,
      });
    }

    if (!conLineaBase) {
      memoria.current = { vistos, conLineaBase: true };
      guardarVistos(vistos);
      return;
    }
    if (nuevas.length === 0) return;
    guardarVistos(vistos);
    setCola(actual => [...actual, ...nuevas].slice(0, MAX_EN_COLA));
  }, [cargando, providerProfile, solicitudes, postulaciones, cotizaciones]);

  return {
    eleccion: cola[0] ?? null,
    cerrar: () => setCola(actual => actual.slice(1)),
  };
}
