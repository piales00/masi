import { describe, expect, it } from 'vitest';
import { friendlyError } from './contractErrors';

describe('friendlyError', () => {
  it('traduce los códigos de la tabla', () => {
    expect(friendlyError(new Error('HostError: Error(Contract, #4)'))).toBe('Este trabajo ya avanzó. Actualiza la página.');
    expect(friendlyError(new Error('HostError: Error(Contract, #7)'))).toBe('El adelanto no puede pasar del 50%.');
    expect(friendlyError(new Error('Error(Contract, #9)'))).toBe('La descripción es muy larga.');
  });

  it('usa el mensaje genérico para los códigos sin texto propio', () => {
    expect(friendlyError(new Error('Error(Contract, #1)'))).toBe('Algo salió mal. Inténtalo de nuevo.');
    expect(friendlyError(new Error('cualquier otra cosa'))).toBe('Algo salió mal. Inténtalo de nuevo.');
  });

  it('reconoce la huella cancelada', () => {
    expect(friendlyError(new DOMException('cancelada', 'NotAllowedError')))
      .toBe('No se confirmó tu huella. Inténtalo de nuevo.');
  });

  it('nunca devuelve el código crudo', () => {
    expect(friendlyError(new Error('Error(Contract, #7)'))).not.toContain('#7');
  });
});
