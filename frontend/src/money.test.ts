import { describe, expect, it } from 'vitest';
import { FEE_BPS } from './config';
import { formatSoles, materialsBpsOf, portion, solesToStroops } from './money';

describe('solesToStroops', () => {
  it('convierte enteros y decimales', () => {
    expect(solesToStroops('1200')).toBe(12000000000n);
    expect(solesToStroops('0.01')).toBe(100000n);
    expect(solesToStroops('1200.5')).toBe(12005000000n);
  });

  it('rechaza lo que el contrato no admite', () => {
    expect(() => solesToStroops('1.234')).toThrow();
    expect(() => solesToStroops('-5')).toThrow();
    expect(() => solesToStroops('abc')).toThrow();
  });
});

describe('el caso del vídeo', () => {
  const total = solesToStroops('1200');
  const materiales = solesToStroops('360');

  it('reparte 3000 bps de materiales', () => {
    expect(materialsBpsOf(total, materiales)).toBe(3000);
    expect(portion(total, 3000)).toBe(solesToStroops('360'));
  });

  it('cobra 5 % de comisión y suma S/1.260', () => {
    const comision = portion(total, FEE_BPS);
    expect(comision).toBe(solesToStroops('60'));
    expect(formatSoles(total + comision)).toBe('S/ 1,260');
  });
});

describe('tope del 50 %', () => {
  it('recorta a 5000 bps y deja el adelanto en S/600', () => {
    const total = solesToStroops('1200');
    expect(materialsBpsOf(total, solesToStroops('700'))).toBe(5000);
    expect(portion(total, 5000)).toBe(solesToStroops('600'));
  });
});

describe('formatSoles', () => {
  it('usa el mismo formato que el catálogo', () => {
    expect(formatSoles(12000000000n)).toBe('S/ 1,200');
    expect(formatSoles(100000n)).toBe('S/ 0.01');
  });
});
