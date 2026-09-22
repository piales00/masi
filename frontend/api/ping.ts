/** Diagnóstico: sin ninguna dependencia. */
export function GET(): Response {
  return Response.json({ ping: true });
}
