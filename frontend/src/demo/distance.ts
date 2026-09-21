/**
 * Distancia simulada, estable para una misma solicitud. No hay geolocalización real
 * todavía: cuando la haya, se reemplaza esta función por el cálculo verdadero.
 */
export function mockDistanceKm(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 10007;
  return Math.round((10 + (hash % 85)) ) / 10;
}
