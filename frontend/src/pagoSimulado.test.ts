import { describe, expect, it } from 'vitest';
import {
  celularValido, codigoValido, cvcValido, fechaDeConstancia, formatearTarjeta,
  formatearVencimiento, numeroOperacion, tarjetaValida, vencimientoValido,
} from './pagoSimulado';

describe('celular', () => {
  it('acepta nueve dígitos que empiezan por 9', () => {
    expect(celularValido('987654321')).toBe(true);
    expect(celularValido('987 654 321')).toBe(true);
  });

  it('rechaza los que no son celulares peruanos', () => {
    expect(celularValido('12345678')).toBe(false);
    expect(celularValido('887654321')).toBe(false);
    expect(celularValido('9876543210')).toBe(false);
  });
});

describe('código de aprobación', () => {
  it('son seis dígitos', () => {
    expect(codigoValido('123456')).toBe(true);
    expect(codigoValido('12345')).toBe(false);
    expect(codigoValido('abcdef')).toBe(false);
  });
});

describe('tarjeta', () => {
  it('agrupa de cuatro en cuatro mientras se escribe', () => {
    expect(formatearTarjeta('4111111111111111')).toBe('4111 1111 1111 1111');
    expect(formatearTarjeta('41111')).toBe('4111 1');
    expect(formatearTarjeta('4111abc1')).toBe('4111 1');
  });

  it('no pasa de dieciséis dígitos', () => {
    expect(formatearTarjeta('41111111111111119999')).toBe('4111 1111 1111 1111');
  });

  it('aplica Luhn, así que un número inventado no cuela', () => {
    expect(tarjetaValida('4111 1111 1111 1111')).toBe(true);
    expect(tarjetaValida('1111 1111 1111 1111')).toBe(false);
    expect(tarjetaValida('4111 1111 1111 111')).toBe(false);
  });
});

describe('vencimiento', () => {
  const ahora = new Date(2026, 8, 23); // 23 de septiembre de 2026

  it('se escribe como MM/AA', () => {
    expect(formatearVencimiento('12')).toBe('12');
    expect(formatearVencimiento('1228')).toBe('12/28');
    expect(formatearVencimiento('12/28')).toBe('12/28');
  });

  it('vale hasta el final del mes indicado', () => {
    expect(vencimientoValido('09/26', ahora)).toBe(true);
    expect(vencimientoValido('08/26', ahora)).toBe(false);
    expect(vencimientoValido('01/27', ahora)).toBe(true);
  });

  it('rechaza meses que no existen y formatos raros', () => {
    expect(vencimientoValido('13/28', ahora)).toBe(false);
    expect(vencimientoValido('00/28', ahora)).toBe(false);
    expect(vencimientoValido('1228', ahora)).toBe(false);
  });
});

describe('CVC', () => {
  it('son tres o cuatro dígitos', () => {
    expect(cvcValido('123')).toBe(true);
    expect(cvcValido('1234')).toBe(true);
    expect(cvcValido('12')).toBe(false);
    expect(cvcValido('12a')).toBe(false);
  });
});

describe('constancia', () => {
  it('el número de operación tiene forma estable', () => {
    expect(numeroOperacion(() => 0)).toBe('MS-AAAAAAAA');
    expect(numeroOperacion(() => 0.999999)).toMatch(/^MS-9{8}$/);
  });

  it('no usa letras que se confundan con números', () => {
    const todos = Array.from({ length: 200 }, () => numeroOperacion()).join('');
    expect(todos).not.toMatch(/[IO]/);
  });

  it('la fecha sale en formato peruano y legible', () => {
    expect(fechaDeConstancia(new Date(2026, 8, 23, 11, 40))).toContain('23');
  });
});
