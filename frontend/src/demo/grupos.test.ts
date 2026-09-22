import { describe, expect, it } from 'vitest';
import type { Job } from '../../../shared/escrow';
import type { Cotizacion, Solicitud } from './DemoContext';
import { grupoDeSolicitud, jobIdDeSolicitud } from './selectors';
import type { Tag } from '../escrow/mockEscrow';
import { solesToStroops } from '../money';

const solicitud = (estado: Solicitud['estado'], id = 's1'): Solicitud => ({
  id,
  servicio: 'Pintura',
  descripcion: 'Pintar la sala',
  fotos: [],
  ubicacion: 'Av. 1',
  distrito: 'Chorrillos',
  cuando: 'Hoy',
  cliente: 'Samuel Ortega',
  clienteId: 'cliente-1',
  estado,
  creadaEn: new Date().toISOString(),
});

const cotizacionAceptada = (solicitudId: string, jobId: string | null): Cotizacion => ({
  id: `c-${solicitudId}`,
  solicitudId,
  postulacionId: 'p1',
  providerId: 'juan',
  providerAddress: 'C',
  clienteId: 'cliente-1',
  totalStroops: '12000000000',
  materialesStroops: '3600000000',
  materialsBps: 3000,
  feeBps: 500,
  reviewSecs: 86400,
  descripcion: 'x',
  estado: 'aceptada',
  jobId,
  txHash: 'abc',
  creadaEn: new Date().toISOString(),
  actualizadaEn: new Date().toISOString(),
});

const job = (tag: Tag, id = 1n): Job => ({
  id,
  client: 'cliente-1',
  provider: 'juan',
  amount: solesToStroops('1200'),
  materials_bps: 3000,
  fee_bps: 500,
  review_secs: 86400n,
  description: 'Pintar la sala',
  state: { tag, values: undefined as unknown as void },
  materials_amount: solesToStroops('360'),
  fee_amount: solesToStroops('60'),
  remaining_amount: 0n,
  created_at: 1n,
  submitted_at: undefined,
  released_at: undefined,
  rated: false,
  stars: 0,
  comment_hash: undefined,
});

describe('grupoDeSolicitud', () => {
  it('una solicitud sin profesional elegido está buscando', () => {
    expect(grupoDeSolicitud(solicitud('buscando_profesionales'), [], [])).toBe('buscando');
  });

  it('elegir profesional la mueve a coordinación', () => {
    expect(grupoDeSolicitud(solicitud('profesional_elegido'), [], [])).toBe('coordinando');
    expect(grupoDeSolicitud(solicitud('cotizada'), [], [])).toBe('coordinando');
  });

  it('Requested y Accepted siguen siendo coordinación', () => {
    const cotizaciones = [cotizacionAceptada('s1', '1')];
    expect(grupoDeSolicitud(solicitud('contratada'), cotizaciones, [job('Requested')])).toBe('coordinando');
    expect(grupoDeSolicitud(solicitud('contratada'), cotizaciones, [job('Accepted')])).toBe('coordinando');
  });

  it('desde el pago protegido el servicio está en curso', () => {
    const cotizaciones = [cotizacionAceptada('s1', '1')];
    for (const tag of ['Funded', 'Started', 'Submitted', 'Disputed'] as Tag[]) {
      expect(grupoDeSolicitud(solicitud('contratada'), cotizaciones, [job(tag)])).toBe('enCurso');
    }
  });

  it('un servicio terminado sale de Solicitudes', () => {
    const cotizaciones = [cotizacionAceptada('s1', '1')];
    for (const tag of ['Released', 'Resolved', 'Cancelled'] as Tag[]) {
      expect(grupoDeSolicitud(solicitud('contratada'), cotizaciones, [job(tag)])).toBeNull();
    }
  });

  it('mientras el trabajo no se ha leído todavía no se clasifica', () => {
    expect(grupoDeSolicitud(solicitud('contratada'), [cotizacionAceptada('s1', '1')], [])).toBeNull();
  });

  it('contratada sin trabajo registrado se sigue coordinando', () => {
    expect(grupoDeSolicitud(solicitud('contratada'), [cotizacionAceptada('s1', null)], [])).toBe('coordinando');
    expect(grupoDeSolicitud(solicitud('contratada'), [], [])).toBe('coordinando');
  });

  it('cada solicitud cae en un único grupo', () => {
    const cotizaciones = [cotizacionAceptada('s3', '1')];
    const jobs = [job('Funded')];
    const solicitudes = [
      solicitud('buscando_profesionales', 's1'),
      solicitud('profesional_elegido', 's2'),
      solicitud('contratada', 's3'),
    ];
    const grupos = solicitudes.map(item => grupoDeSolicitud(item, cotizaciones, jobs));
    expect(grupos).toEqual(['buscando', 'coordinando', 'enCurso']);
    expect(new Set(grupos).size).toBe(3);
  });
});

describe('jobIdDeSolicitud', () => {
  it('solo mira la cotización aceptada', () => {
    expect(jobIdDeSolicitud('s1', [cotizacionAceptada('s1', '7')])).toBe('7');
    expect(jobIdDeSolicitud('s1', [{ ...cotizacionAceptada('s1', '7'), estado: 'rechazada' }])).toBeNull();
    expect(jobIdDeSolicitud('s1', [])).toBeNull();
  });
});
