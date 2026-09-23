import { describe, expect, it } from 'vitest';
import type { Job } from '../../../shared/escrow';
import { solesToStroops } from '../money';
import {
  ETIQUETA,
  esActivo,
  esTerminal,
  liberaSolo,
  puedeLiberarseSolo,
  puedeCalificar,
  requiereAccionDe,
  resumenDelProfesional,
  trabajosPorAtender,
  vistaDelTrabajo,
} from './jobs';
import type { Tag } from './mockEscrow';

const AHORA = 1_800_000_000n;

function job(tag: Tag, extra: Partial<Job> = {}): Job {
  const amount = solesToStroops('1200');
  return {
    id: 1n,
    client: 'cliente',
    provider: 'profesional',
    amount,
    materials_bps: 3000,
    fee_bps: 500,
    review_secs: 86400n,
    description: 'Pintar la sala',
    state: { tag, values: undefined as unknown as void },
    materials_amount: solesToStroops('360'),
    fee_amount: solesToStroops('60'),
    remaining_amount: 0n,
    created_at: AHORA - 100000n,
    submitted_at: undefined,
    released_at: undefined,
    rated: false,
    stars: 0,
    comment_hash: undefined,
    ...extra,
  };
}

describe('activo contra terminal', () => {
  it('clasifica los nueve estados', () => {
    const activos: Tag[] = ['Requested', 'Accepted', 'Funded', 'Started', 'Submitted', 'Disputed'];
    const terminales: Tag[] = ['Released', 'Resolved', 'Cancelled'];
    for (const tag of activos) {
      expect(esActivo(job(tag))).toBe(true);
      expect(esTerminal(job(tag))).toBe(false);
    }
    for (const tag of terminales) {
      expect(esTerminal(job(tag))).toBe(true);
      expect(esActivo(job(tag))).toBe(false);
    }
  });
});

describe('acción principal por rol', () => {
  const principal = (tag: Tag, role: 'client' | 'provider', extra?: Partial<Job>) =>
    vistaDelTrabajo(job(tag, extra), role, { contraparte: 'Juan', ahora: AHORA }).principal?.id ?? null;

  it('da la acción a quien le toca en el camino feliz', () => {
    expect(principal('Requested', 'provider')).toBe('accept');
    expect(principal('Requested', 'client')).toBeNull();

    expect(principal('Accepted', 'client')).toBe('fund');
    expect(principal('Accepted', 'provider')).toBeNull();

    expect(principal('Funded', 'provider')).toBe('start');
    expect(principal('Funded', 'client')).toBeNull();

    expect(principal('Started', 'provider')).toBe('submit');
    expect(principal('Started', 'client')).toBeNull();

    expect(principal('Submitted', 'client', { submitted_at: AHORA - 60n })).toBe('approve');
    expect(principal('Submitted', 'provider', { submitted_at: AHORA - 60n })).toBeNull();
  });

  it('no ofrece ninguna acción en los estados terminales', () => {
    for (const tag of ['Released', 'Resolved', 'Cancelled', 'Disputed'] as Tag[]) {
      expect(principal(tag, 'client')).toBeNull();
      expect(principal(tag, 'provider')).toBeNull();
    }
  });

  it('ofrece «Tengo un problema» solo en Started y Submitted', () => {
    const secundaria = (tag: Tag, role: 'client' | 'provider') =>
      vistaDelTrabajo(job(tag, { submitted_at: AHORA - 60n }), role, { contraparte: 'Juan', ahora: AHORA }).secundaria?.id ?? null;
    expect(secundaria('Started', 'client')).toBe('dispute');
    expect(secundaria('Started', 'provider')).toBe('dispute');
    expect(secundaria('Submitted', 'client')).toBe('dispute');
    expect(secundaria('Submitted', 'provider')).toBe('dispute');
    for (const tag of ['Requested', 'Accepted', 'Funded', 'Released', 'Disputed'] as Tag[]) {
      expect(secundaria(tag, 'client')).toBeNull();
      expect(secundaria(tag, 'provider')).toBeNull();
    }
  });
});

describe('liberación automática', () => {
  it('calcula el momento a partir de submitted_at y review_secs', () => {
    expect(liberaSolo(job('Submitted', { submitted_at: AHORA }))).toBe(AHORA + 86400n);
    expect(liberaSolo(job('Started'))).toBeNull();
    expect(liberaSolo(job('Submitted'))).toBeNull();
  });

  it('solo está vencido pasado el plazo', () => {
    expect(puedeLiberarseSolo(job('Submitted', { submitted_at: AHORA - 60n }), AHORA)).toBe(false);
    expect(puedeLiberarseSolo(job('Submitted', { submitted_at: AHORA - 86400n }), AHORA)).toBe(true);
  });

  it('no le pide nada al profesional cuando vence: la liberación es automática', () => {
    const vigente = vistaDelTrabajo(job('Submitted', { submitted_at: AHORA - 60n }), 'provider', { contraparte: 'María', ahora: AHORA });
    expect(vigente.principal).toBeNull();
    expect(vigente.vencido).toBe(false);

    const vencido = vistaDelTrabajo(job('Submitted', { submitted_at: AHORA - 90000n }), 'provider', { contraparte: 'María', ahora: AHORA });
    expect(vencido.vencido).toBe(true);
    expect(vencido.principal).toBeNull();
    expect(vencido.detalle).toContain('automáticamente');
  });

  it('el cliente conserva aprobar aunque el plazo haya vencido', () => {
    const vencido = vistaDelTrabajo(job('Submitted', { submitted_at: AHORA - 90000n }), 'client', { contraparte: 'Juan', ahora: AHORA });
    expect(vencido.principal?.id).toBe('approve');
  });
});

describe('badges', () => {
  it('cuenta solo los activos que esperan una acción de ese rol', () => {
    const jobs: Job[] = [
      job('Requested', { id: 1n }),
      job('Accepted', { id: 2n }),
      job('Funded', { id: 3n }),
      job('Released', { id: 4n }),
      job('Disputed', { id: 5n }),
    ];
    expect(trabajosPorAtender(jobs, 'provider', AHORA).map(item => item.id)).toEqual([1n, 3n]);
    expect(trabajosPorAtender(jobs, 'client', AHORA).map(item => item.id)).toEqual([2n]);
  });

  it('un trabajo terminal nunca requiere acción', () => {
    expect(requiereAccionDe(job('Released'), 'client', AHORA)).toBe(false);
    expect(requiereAccionDe(job('Cancelled'), 'provider', AHORA)).toBe(false);
  });

  it('esperar y requerir acción son excluyentes', () => {
    const vista = vistaDelTrabajo(job('Requested'), 'client', { contraparte: 'Juan', ahora: AHORA });
    expect(vista.esperando).toBe(true);
    expect(vista.requiereAccion).toBe(false);
  });
});

describe('lenguaje de la interfaz', () => {
  it('traduce cada estado y nunca muestra el nombre interno', () => {
    const internos = ['Requested', 'Accepted', 'Funded', 'Started', 'Submitted', 'Released', 'Disputed', 'Resolved', 'Cancelled'];
    for (const tag of internos as Tag[]) {
      for (const role of ['client', 'provider'] as const) {
        const vista = vistaDelTrabajo(job(tag, { submitted_at: AHORA - 60n }), role, { contraparte: 'Juan', ahora: AHORA });
        const texto = `${vista.etiqueta} ${vista.titulo} ${vista.detalle} ${vista.principal?.label ?? ''}`;
        for (const interno of internos) expect(texto).not.toContain(interno);
      }
    }
    expect(ETIQUETA.Requested).toBe('Esperando confirmación');
  });

  it('usa el nombre de la contraparte y cae en un genérico si falta', () => {
    expect(vistaDelTrabajo(job('Requested'), 'provider', { contraparte: 'María', ahora: AHORA }).detalle).toContain('María');
    expect(vistaDelTrabajo(job('Requested'), 'client', { contraparte: '', ahora: AHORA }).detalle).toContain('el profesional');
  });

  it('no rompe con un estado desconocido', () => {
    const raro = job('Requested');
    const vista = vistaDelTrabajo({ ...raro, state: { tag: 'Loquesea' as Tag, values: undefined as unknown as void } }, 'client', { contraparte: 'Juan', ahora: AHORA });
    expect(vista.principal).toBeNull();
    expect(vista.titulo).toBe('Trabajo');
  });
});

describe('calificar', () => {
  it('solo el cliente, una vez y con el trabajo cerrado', () => {
    expect(puedeCalificar(job('Released'), 'client')).toBe(true);
    expect(puedeCalificar(job('Resolved'), 'client')).toBe(true);
    expect(puedeCalificar(job('Released'), 'provider')).toBe(false);
    expect(puedeCalificar(job('Released', { rated: true, stars: 5 }), 'client')).toBe(false);
  });

  it('no se ofrece mientras el trabajo sigue vivo', () => {
    for (const tag of ['Requested', 'Accepted', 'Funded', 'Started', 'Submitted', 'Disputed', 'Cancelled'] as Tag[]) {
      expect(puedeCalificar(job(tag), 'client')).toBe(false);
    }
  });
});

describe('resumen del profesional', () => {
  it('sin trabajos, todo en cero', () => {
    expect(resumenDelProfesional([])).toEqual({ completados: 0, ganado: 0n });
  });

  it('cuenta los completados y suma lo que cobró en cada uno', () => {
    const jobs = [
      job('Released', { id: 1n, amount: solesToStroops('1200') }),
      job('Released', { id: 2n, amount: solesToStroops('800') }),
    ];
    expect(resumenDelProfesional(jobs)).toEqual({ completados: 2, ganado: solesToStroops('2000') });
  });

  it('lo que sigue vivo no cuenta todavía', () => {
    const jobs = ['Requested', 'Accepted', 'Funded', 'Started', 'Submitted', 'Disputed']
      .map((tag, indice) => job(tag as Tag, { id: BigInt(indice + 1) }));
    expect(resumenDelProfesional(jobs)).toEqual({ completados: 0, ganado: 0n });
  });

  it('un resuelto o un cancelado no inventan ingresos', () => {
    // El reparto del árbitro no está en el Job, y un cancelado no movió dinero.
    expect(resumenDelProfesional([job('Resolved'), job('Cancelled')]))
      .toEqual({ completados: 0, ganado: 0n });
  });
});
