import { beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { DemoProvider, addressOfProvider, providerAddressOf, useDemo } from './DemoContext';
import type { Postulacion, ProviderProfile } from './DemoContext';

const PROVIDER_KEY = 'masi.demo.profesional.v2';
const SESSION_KEY = 'masi.demo.sesion.v2';
const REQUESTS_KEY = 'masi.demo.solicitudes.v1';

/** Una cuenta creada con huella: `id` y `contractId` son la misma dirección C. */
const CONTRATO = 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K';
const conPasskey: ProviderProfile = {
  id: CONTRATO,
  contractId: CONTRATO,
  deploymentHash: 'abc123',
  fullName: 'Fabricio Mendez',
  services: ['Pintura'],
  district: 'Surco',
  yearsExperience: 3,
  bio: '',
};

/** Un profesional del catálogo: no tiene cuenta propia, su dirección es la de su ficha. */
const delCatalogo: ProviderProfile = {
  id: 'juan',
  fullName: 'Juan Ramírez',
  services: ['Pintura'],
  district: 'Surco',
  yearsExperience: 8,
  bio: '',
};

/** Alguien que completó el perfil sin llegar a crear la cuenta. */
const sinCuenta: ProviderProfile = { ...delCatalogo, id: 'nadie-1234', fullName: 'Sin Cuenta' };

function sembrar(perfil: ProviderProfile): void {
  localStorage.clear();
  localStorage.setItem(PROVIDER_KEY, JSON.stringify(perfil));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ client: false, provider: true }));
  localStorage.setItem(REQUESTS_KEY, JSON.stringify([{
    id: 's1', servicio: 'Pintura', descripcion: 'Pintar la sala', fotos: [], ubicacion: 'Av. 1',
    distrito: 'Surco', cuando: 'Hoy', cliente: 'María Torres', clienteId: 'cliente-1',
    estado: 'buscando_profesionales', creadaEn: new Date().toISOString(),
  }]));
}

/** Envía una propuesta con el DemoProvider real y devuelve la postulación guardada. */
async function postular(perfil: ProviderProfile): Promise<Postulacion> {
  sembrar(perfil);
  let enviar: (() => Promise<Postulacion>) | null = null;

  function Sonda() {
    const { providerProfile, sendProposal } = useDemo();
    enviar = () => sendProposal({ solicitudId: 's1', providerId: providerProfile?.id ?? '', precio: 120, minutos: 30 });
    return null;
  }

  render(<DemoProvider><Sonda /></DemoProvider>);
  let creada: Postulacion | undefined;
  await act(async () => { creada = await enviar!(); });
  return creada!;
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('providerAddressOf', () => {
  it('usa el contractId de la cuenta con huella', () => {
    expect(providerAddressOf(conPasskey, CONTRATO)).toBe(CONTRATO);
  });

  it('cae al catálogo cuando la cuenta no tiene contractId', () => {
    expect(providerAddressOf(delCatalogo, 'juan')).toBe(addressOfProvider('juan'));
    expect(providerAddressOf(null, 'juan')).toBe(addressOfProvider('juan'));
  });

  it('devuelve null cuando no hay ninguna dirección', () => {
    expect(providerAddressOf(sinCuenta, 'nadie-1234')).toBeNull();
    expect(providerAddressOf(null, 'nadie-1234')).toBeNull();
  });

  it('no presta la dirección de una cuenta a otro profesional', () => {
    expect(providerAddressOf(conPasskey, 'otro-id')).toBeNull();
    expect(providerAddressOf(conPasskey, 'juan')).toBe(addressOfProvider('juan'));
  });

  it('ignora un contractId vacío', () => {
    expect(providerAddressOf({ ...conPasskey, id: 'juan', contractId: '  ' }, 'juan')).toBe(addressOfProvider('juan'));
  });
});

describe('sendProposal congela la dirección correcta', () => {
  it('caso A: cuenta con huella, guarda su contractId', async () => {
    const postulacion = await postular(conPasskey);
    expect(postulacion.providerAddress).toBe(CONTRATO);
    expect(postulacion.providerNombre).toBe('Fabricio Mendez');
  });

  it('caso B: profesional del catálogo, conserva la dirección de su ficha', async () => {
    const postulacion = await postular(delCatalogo);
    expect(postulacion.providerAddress).toBe(addressOfProvider('juan'));
    expect(postulacion.providerAddress).toMatch(/^C[A-Z2-7]{55}$/);
  });

  it('caso C: sin dirección, la postulación se guarda con null y el bloqueo sigue', async () => {
    const postulacion = await postular(sinCuenta);
    expect(postulacion.providerAddress).toBeNull();
  });

  it('la dirección queda persistida en la postulación, no recalculada', async () => {
    await postular(conPasskey);
    const guardadas = JSON.parse(localStorage.getItem('masi.demo.postulaciones.v1') ?? '[]') as Postulacion[];
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].providerAddress).toBe(CONTRATO);
    expect(guardadas[0].solicitudId).toBe('s1');
    expect(guardadas[0].precio).toBe(120);
  });
});
