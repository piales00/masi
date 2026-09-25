import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DemoProvider } from '../demo/DemoContext';
import { RechargeScreen } from './RechargeScreen';

const CUENTA = 'CDSPVAOAQIYVQWS7JSTTXKRCZLJGSKMZJDCHRI6I2FIJA3NQMIJQL5PP';
const peticiones: Array<{ url: string; init?: RequestInit }> = [];

function sembrar(contractId: string | undefined) {
  localStorage.clear();
  localStorage.setItem('masi.demo.clienteId.v1', JSON.stringify('cliente-1'));
  localStorage.setItem('masi.demo.cliente.v2', JSON.stringify({
    firstName: 'Piero', lastName: 'Pérez', phone: '9', district: 'Chorrillos', contractId,
  }));
  localStorage.setItem('masi.demo.sesion.v2', JSON.stringify({ client: true, provider: false }));
}

const pintar = () => render(<MemoryRouter><DemoProvider><RechargeScreen /></DemoProvider></MemoryRouter>);

const escribir = (etiqueta: RegExp, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

/** Rellena Yape con datos válidos. */
function rellenarYape() {
  escribir(/Número de celular/, '987654321');
  escribir(/Código de aprobación/, '123456');
}

const boton = () => screen.getByRole('button', { name: /Confirmar pago|Confirmando pago/ }) as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  peticiones.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    peticiones.push({ url: String(url), init });
    return new Response(JSON.stringify({ saldoStroops: '8950000000' }), { status: 200 });
  }));
});

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('pantalla de recarga', () => {
  it('no deja pagar hasta que el formulario de Yape está completo', () => {
    sembrar(CUENTA);
    pintar();
    expect(boton().disabled).toBe(true);

    escribir(/Número de celular/, '98765432');
    expect(boton().disabled).toBe(true);

    escribir(/Número de celular/, '987654321');
    escribir(/Código de aprobación/, '12345');
    expect(boton().disabled).toBe(true);

    escribir(/Código de aprobación/, '123456');
    expect(boton().disabled).toBe(false);
  });

  it('nunca envía los datos del pago: solo la cuenta y el monto', async () => {
    sembrar(CUENTA);
    pintar();
    rellenarYape();
    fireEvent.click(boton());
    await vi.advanceTimersByTimeAsync(2100);

    const envio = peticiones.find(p => p.init?.method === 'POST');
    expect(envio).toBeTruthy();
    const cuerpo = JSON.parse(String(envio?.init?.body)) as Record<string, unknown>;
    expect(Object.keys(cuerpo).sort()).toEqual(['address', 'soles']);
    expect(cuerpo).toEqual({ address: CUENTA, soles: 100 });
    // Ni el celular ni el código aparecen en ninguna petición.
    const todo = JSON.stringify(peticiones);
    expect(todo).not.toContain('987654321');
    expect(todo).not.toContain('123456');
  });

  it('muestra una constancia con número de operación', async () => {
    sembrar(CUENTA);
    pintar();
    rellenarYape();
    fireEvent.click(boton());
    await vi.advanceTimersByTimeAsync(2100);

    expect(await screen.findByText('Pago completado')).toBeTruthy();
    expect(screen.getByText('Recarga de saldo')).toBeTruthy();
    expect(screen.getByText(/^MS-[A-Z0-9]{8}$/)).toBeTruthy();
    expect(screen.getByText('S/ 895')).toBeTruthy();
  });

  it('con tarjeta exige un número que pase Luhn', () => {
    sembrar(CUENTA);
    pintar();
    fireEvent.click(screen.getByRole('tab', { name: /Tarjeta/ }));

    escribir(/Nombre en la tarjeta/, 'María Torres');
    escribir(/Número de tarjeta/, '1111111111111111');
    escribir(/Vencimiento/, '1230');
    escribir(/CVC/, '123');
    expect(boton().disabled).toBe(true);

    escribir(/Número de tarjeta/, '4111111111111111');
    expect(boton().disabled).toBe(false);
  });

  it('el monto elegido manda en el resumen y en el envío', async () => {
    sembrar(CUENTA);
    pintar();
    fireEvent.click(screen.getByRole('button', { name: 'S/ 1,200' }));
    rellenarYape();
    fireEvent.click(boton());
    await vi.advanceTimersByTimeAsync(2100);

    const envio = peticiones.find(p => p.init?.method === 'POST');
    expect(JSON.parse(String(envio?.init?.body)).soles).toBe(1200);
  });

  it('si el abono falla lo dice y devuelve el formulario', async () => {
    sembrar(CUENTA);
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init?: RequestInit) => init?.method === 'POST'
      ? new Response(JSON.stringify({ error: { message: 'La recarga no está configurada en el servidor.' } }), { status: 500 })
      : new Response(JSON.stringify({ saldoStroops: '0' }), { status: 200 })));
    pintar();
    rellenarYape();
    fireEvent.click(boton());
    await vi.advanceTimersByTimeAsync(2100);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('no está configurada'));
    expect(boton().disabled).toBe(false);
  });

  it('no anuncia que sea una demostración, y sí que no guarda los datos de pago', () => {
    sembrar(CUENTA);
    pintar();
    // Lo que se manda al servidor es solo la cuenta y el monto; la tarjeta no sale de aquí.
    expect(screen.getByText(/Tus datos de pago no se guardan/)).toBeTruthy();
    expect(screen.queryByText(/demo/i)).toBeNull();
    expect(screen.queryByText(/no se realiza ningún cobro/)).toBeNull();
  });

  it('pide crear la cuenta si no hay ninguna', () => {
    sembrar(undefined);
    pintar();
    expect(screen.getByText(/Crea tu cuenta con tu huella/)).toBeTruthy();
  });
});
