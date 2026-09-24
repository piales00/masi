import { useEffect, useRef, useState } from 'react';
import { useDemo } from './demo/DemoContext';
import type { Role } from './demo/DemoContext';
import { alertasPara } from './demo/selectors';
import type { Trade } from './marketplace';

/**
 * Cuánto tiempo se queda el aviso en pantalla. Es **solo** eso: cuando se acaba
 * desaparece la tarjeta y nada más. La solicitud sigue publicada, las postulaciones
 * siguen ahí y ningún estado cambia. No es un plazo de negocio.
 */
export const DURACION_AVISO_MS = 30_000;

/** Con más de tres en espera dejaría de ser un aviso y sería una cola infinita. */
const MAX_EN_COLA = 3;

/**
 * Lo ya visto se guarda en la pestaña, no en el componente.
 *
 * Vivía en un `ref`, y eso lo ataba a la vida del montaje: bastaba una recarga —o que el
 * navegador del móvil descartara la pestaña en segundo plano, que es lo normal— para que
 * la memoria se perdiera y todo volviera a ser «línea base». La solicitud aparecía en la
 * lista y el aviso no salía nunca, que es justo lo que pasó en la prueba real.
 *
 * `sessionStorage` dura lo que dura la pestaña: al abrirla de cero no hay nada apuntado y
 * la primera lectura es la línea base, sin avisos; al recargar, lo que llegó mientras
 * tanto sí es nuevo de verdad y se avisa.
 */
const CLAVE_VISTOS = (role: Role): string => `masi.avisos.vistos.${role}.v1`;
/** Tope para que la clave no crezca sin fin; se conservan los más recientes. */
const MAX_VISTOS = 200;

/** `null` cuando esta pestaña todavía no tiene línea base. */
function leerVistos(role: Role): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(CLAVE_VISTOS(role));
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? new Set(value.filter((item): item is string => typeof item === 'string')) : null;
  } catch {
    return null;
  }
}

function guardarVistos(role: Role, vistos: Set<string>): void {
  try {
    sessionStorage.setItem(CLAVE_VISTOS(role), JSON.stringify([...vistos].slice(-MAX_VISTOS)));
  } catch {
    // Sin almacenamiento la memoria dura lo que dure el montaje, como antes.
  }
}

export interface Aviso {
  /** Las postulaciones de una misma solicitud comparten id: por eso se agrupan. */
  id: string;
  tipo: 'solicitud' | 'postulaciones';
  servicio: Trade;
  distrito: string;
  /** Lo que pidió el cliente; solo en el aviso del profesional. */
  descripcion: string;
  /** Quiénes postularon desde que se abrió el aviso; solo en el del cliente. */
  nombres: string[];
  destino: string;
}

/** Añade los nuevos a la cola, o engorda el que ya estaba para esa misma solicitud. */
function fusionar(cola: Aviso[], nuevos: Aviso[]): Aviso[] {
  const resultado = [...cola];
  for (const aviso of nuevos) {
    const indice = resultado.findIndex(item => item.id === aviso.id);
    if (indice === -1) resultado.push(aviso);
    else resultado[indice] = { ...resultado[indice], nombres: [...resultado[indice].nombres, ...aviso.nombres] };
  }
  return resultado.slice(0, MAX_EN_COLA);
}

/**
 * Avisa de lo que aparece **mientras** la persona está dentro, leyendo los mismos datos
 * que ya trae la sincronización: no hay una segunda fuente de solicitudes ni un canal
 * nuevo. El profesional se entera de una solicitud compatible recién publicada y el
 * cliente, de quién acaba de postular a la suya.
 *
 * Lo que ya existía al entrar no avisa de nada. La primera vuelta con datos de esta
 * pestaña —en modo API, cuando termina la primera carga— apunta todo lo conocido y sale;
 * a partir de ahí solo sorprende lo que no estaba en esa lista. Cada id se apunta en
 * cuanto se ve, así que el mismo aviso no vuelve por cada vuelta del polling ni por cada
 * render, y lo apuntado sobrevive a una recarga o a un remontaje de la pantalla.
 */
export function useNovedades(role: Role): { aviso: Aviso | null; cerrar: () => void } {
  const { clienteId, providerProfile, solicitudes, postulaciones, cargando } = useDemo();
  const memoria = useRef<{ vistos: Set<string>; conLineaBase: boolean } | null>(null);
  if (memoria.current === null) {
    const guardados = leerVistos(role);
    memoria.current = { vistos: guardados ?? new Set(), conLineaBase: guardados !== null };
  }
  const [cola, setCola] = useState<Aviso[]>([]);

  useEffect(() => {
    // Sin la primera respuesta del almacén no hay línea base que establecer todavía.
    if (cargando) return;

    const { vistos, conLineaBase } = memoria.current!;
    const nuevos: Aviso[] = [];

    if (role === 'provider') {
      for (const solicitud of alertasPara(providerProfile, solicitudes, postulaciones)) {
        if (vistos.has(solicitud.id)) continue;
        vistos.add(solicitud.id);
        nuevos.push({
          id: `solicitud:${solicitud.id}`,
          tipo: 'solicitud',
          servicio: solicitud.servicio,
          distrito: solicitud.distrito,
          descripcion: solicitud.descripcion,
          nombres: [],
          destino: `/profesional/alertas/${solicitud.id}`,
        });
      }
    } else {
      const mias = new Map(solicitudes.filter(item => item.clienteId === clienteId).map(item => [item.id, item]));
      for (const postulacion of postulaciones) {
        const solicitud = mias.get(postulacion.solicitudId);
        if (!solicitud || vistos.has(postulacion.id)) continue;
        vistos.add(postulacion.id);
        nuevos.push({
          id: `postulaciones:${solicitud.id}`,
          tipo: 'postulaciones',
          servicio: solicitud.servicio,
          distrito: solicitud.distrito,
          descripcion: '',
          nombres: [postulacion.providerNombre],
          destino: `/solicitudes/${solicitud.id}`,
        });
      }
    }

    if (!conLineaBase) {
      // Todo lo de la primera vuelta ya quedó apuntado: es el punto de partida, no novedad.
      memoria.current = { vistos, conLineaBase: true };
      guardarVistos(role, vistos);
      return;
    }
    if (nuevos.length === 0) return;
    guardarVistos(role, vistos);
    setCola(actual => fusionar(actual, nuevos));
  }, [cargando, role, clienteId, providerProfile, solicitudes, postulaciones]);

  return {
    aviso: cola[0] ?? null,
    cerrar: () => setCola(actual => actual.slice(1)),
  };
}
