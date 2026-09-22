/** Tabla de INTEGRACION.md. El usuario nunca ve un número de error. */
const MENSAJES: Record<number, string> = {
  3: 'No encontramos ese trabajo.',
  4: 'Este trabajo ya avanzó. Actualiza la página.',
  5: 'No puedes hacer esto en este trabajo.',
  6: 'El monto no es válido.',
  7: 'El adelanto no puede pasar del 50%.',
  9: 'La descripción es muy larga.',
  10: 'No puedes contratarte a ti mismo.',
  12: 'Todavía estás a tiempo de revisar el trabajo.',
  15: 'Ya calificaste este trabajo.',
  16: 'Elige entre 1 y 5 estrellas.',
};

const GENERICO = 'Algo salió mal. Inténtalo de nuevo.';

export function friendlyError(err: unknown): string {
  // El kit conserva la cancelación del navegador como causa del error WebAuthn.
  if (err instanceof Error && err.cause instanceof DOMException && err.cause.name === 'NotAllowedError') {
    return 'No se confirmó tu huella. Inténtalo de nuevo.';
  }
  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    return 'No se confirmó tu huella. Inténtalo de nuevo.';
  }
  const texto = err instanceof Error ? err.message : String(err ?? '');
  const codigo = /Error\(Contract,\s*#(\d+)\)/.exec(texto);
  if (!codigo) return GENERICO;
  return MENSAJES[Number(codigo[1])] ?? GENERICO;
}
