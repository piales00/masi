import { useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { api } from '../api/client';

/**
 * El avatar de un profesional, con su foto si la tiene.
 *
 * La imagen vive en su propio recurso y se pide al pintar, no dentro de la postulación:
 * esa lista se relee cada pocos segundos y arrastrar fotos la haría inservible con datos
 * móviles. Mientras llega —o si no hay— se ven las iniciales, que es lo de siempre.
 */
/**
 * Se memoriza la promesa, no el resultado: en una lista varias tarjetas del mismo
 * profesional se montan a la vez, y guardando solo el resultado cada una lanzaría su
 * propia petición antes de que resolviera la primera.
 */
const cache = new Map<string, Promise<string | null>>();

function pedirFoto(providerId: string): Promise<string | null> {
  const pendiente = cache.get(providerId);
  if (pendiente) return pendiente;
  // Un fallo de red no se memoriza como "sin foto": se olvida para poder reintentar.
  const promesa = api.getFotoProfesional(providerId).catch(() => {
    cache.delete(providerId);
    return null;
  });
  cache.set(providerId, promesa);
  return promesa;
}

export function AvatarProfesional({ providerId, nombre, size, tint }: {
  providerId: string | undefined;
  nombre: string;
  size?: 'lg';
  tint?: Parameters<typeof Avatar>[0]['tint'];
}) {
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId) {
      setFoto(null);
      return;
    }
    let vigente = true;
    // Sin foto legible quedan las iniciales: no es motivo para romper la tarjeta.
    void pedirFoto(providerId).then(leida => { if (vigente) setFoto(leida); });
    return () => { vigente = false; };
  }, [providerId]);

  if (!foto) return <Avatar name={nombre} size={size} tint={tint} />;
  return <img
    src={foto}
    alt={`Foto de ${nombre}`}
    className={size === 'lg'
      ? 'size-14 shrink-0 rounded-full border border-masi-gray object-cover'
      : 'size-11 shrink-0 rounded-full border border-masi-gray object-cover'}
  />;
}

/** Olvida lo memorizado: tras cambiar la propia foto hay que volver a pedirla. */
export function olvidarFotoProfesional(providerId: string): void {
  cache.delete(providerId);
}
