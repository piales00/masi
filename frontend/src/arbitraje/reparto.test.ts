import { describe, expect, it } from 'vitest';
import type { Job } from '../../../shared/escrow';
import { direccionCorta, enDisputa, repartoDe } from './reparto';
import { formatSoles, solesToStroops } from '../money';

const trabajo = (tag: Job['state']['tag']): Job => ({ state: { tag, values: undefined } } as unknown as Job);

describe('reparto de una disputa', () => {
  it('reproduce el caso de DESPLIEGUE.md: S/840 al 70 %', () => {
    const { profesional, cliente } = repartoDe(solesToStroops('840'), 7000);
    expect(formatSoles(profesional)).toBe('S/ 588');
    expect(formatSoles(cliente)).toBe('S/ 252');
  });

  it('reproduce el job 4 de testnet: S/180 en disputa al 70 %', () => {
    // Total S/200, adelanto S/20 ya entregado, S/180 congelados. El adelanto no entra.
    const { profesional, cliente } = repartoDe(solesToStroops('180'), 7000);
    expect(formatSoles(profesional)).toBe('S/ 126');
    expect(formatSoles(cliente)).toBe('S/ 54');
  });

  it('a 0 % todo es del cliente y a 100 % todo del profesional', () => {
    const saldo = solesToStroops('840');
    expect(repartoDe(saldo, 0)).toEqual({ profesional: 0n, cliente: saldo });
    expect(repartoDe(saldo, 10_000)).toEqual({ profesional: saldo, cliente: 0n });
  });

  it('nunca reparte más ni menos que el saldo en disputa', () => {
    const saldo = solesToStroops('1234.56');
    for (const bps of [0, 1, 3_333, 5_000, 7_777, 9_999, 10_000]) {
      const { profesional, cliente } = repartoDe(saldo, bps);
      expect(profesional + cliente).toBe(saldo);
      expect(profesional >= 0n && cliente >= 0n).toBe(true);
    }
  });

  it('el redondeo cae del lado del cliente, igual que en el contrato', () => {
    // El contrato calcula la parte del profesional y le da al cliente lo que sobra.
    expect(repartoDe(3n, 5_000)).toEqual({ profesional: 1n, cliente: 2n });
  });

  it('un saldo de cero no rompe nada', () => {
    expect(repartoDe(0n, 7_000)).toEqual({ profesional: 0n, cliente: 0n });
  });
});

describe('estado del trabajo', () => {
  it('solo los disputados entran en el panel', () => {
    expect(enDisputa(trabajo('Disputed'))).toBe(true);
    for (const tag of ['Funded', 'Started', 'Submitted', 'Released', 'Resolved'] as const) {
      expect(enDisputa(trabajo(tag))).toBe(false);
    }
  });
});

describe('direcciones', () => {
  it('se acortan para que quepan en el móvil', () => {
    expect(direccionCorta('CAGC224PARRU3DZOCRUKOPCFGJU2ADOTNVETMDROKVT6QA5KYXBZ2DVL')).toBe('CAGC22…2DVL');
  });

  it('una dirección ya corta se deja como está', () => {
    expect(direccionCorta('CAGC22')).toBe('CAGC22');
  });
});
