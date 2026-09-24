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
 * Lo que ya existía al entrar no avisa de nada. En la primera vuelta con datos —en modo
 * API, cuando termina la primera carga— se apunta todo lo conocido y se sale; a partir de
 * ahí solo sorprende lo que no estaba en esa lista. Cada id se apunta en cuanto se ve, así
 * que el mismo aviso no vuelve por cada vuelta del polling ni por cada render.
 */
export function useNovedades(role: Role): { aviso: Aviso | null; cerrar: () => void } {
  const { clienteId, providerProfile, solicitudes, postulaciones, cargando } = useDemo();
  const conocidos = useRef(new Set<string>());
  const conLineaBase = useRef(false);
  const [cola, setCola] = useState<Aviso[]>([]);

  useEffect(() => {
    // Sin la primera respuesta del almacén no hay línea base que establecer todavía.
    if (cargando) return;

    const nuevos: Aviso[] = [];

    if (role === 'provider') {
      for (const solicitud of alertasPara(providerProfile, solicitudes, postulaciones)) {
        if (conocidos.current.has(solicitud.id)) continue;
        conocidos.current.add(solicitud.id);
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
        if (!solicitud || conocidos.current.has(postulacion.id)) continue;
        conocidos.current.add(postulacion.id);
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

    if (!conLineaBase.current) {
      // Todo lo de la primera vuelta ya quedó apuntado: es el punto de partida, no novedad.
      conLineaBase.current = true;
      return;
    }
    if (nuevos.length > 0) setCola(actual => fusionar(actual, nuevos));
  }, [cargando, role, clienteId, providerProfile, solicitudes, postulaciones]);

  return {
    aviso: cola[0] ?? null,
    cerrar: () => setCola(actual => actual.slice(1)),
  };
}
