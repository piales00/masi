import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ProgresoDelServicio } from './ProgresoDelServicio';
import { ETAPAS_DEL_SERVICIO } from '../escrow/jobs';
import { solesToStroops } from '../money';
import type { Job } from '../../../shared/escrow';
import type { Tag } from '../escrow/mockEscrow';

function job(tag: Tag): Job {
  const amount = solesToStroops('1200');
  return {
    id: 1n, client: 'cliente', provider: 'profesional', amount,
    materials_bps: 3000, fee_bps: 500, review_secs: 86400n, description: 'Pintar la sala',
    state: { tag, values: undefined as unknown as void },
    materials_amount: solesToStroops('360'), fee_amount: solesToStroops('60'), remaining_amount: 0n,
    created_at: 1_800_000_000n, submitted_at: undefined, released_at: undefined,
    rated: false, stars: 0, comment_hash: undefined,
  };
}

/**
 * Los cuatro tramos de la línea, en orden. Cada uno dice cómo está pintado: sólido
 * cuando la etapa se cumplió, en marcha cuando es el que lleva a la etapa actual, y
 * pendiente cuando todavía no toca.
 */
function tramos(tag: Tag): ('solido' | 'en-marcha' | 'pendiente')[] {
  const { container } = render(<ProgresoDelServicio job={job(tag)} />);
  return [...container.querySelectorAll('li')].slice(1).map(li => {
    const tramo = li.firstElementChild!;
    if (tramo.getAttribute('data-tramo') === 'en-marcha') return 'en-marcha';
    return tramo.className.includes('bg-masi-blue') ? 'solido' : 'pendiente';
  });
}

const enMarcha = (tag: Tag) => tramos(tag).filter(estado => estado === 'en-marcha').length;

describe('el tramo en marcha de la barra', () => {
  it('con la cotización aceptada todavía no hay tramo que recorrer', () => {
    // Nada cumplido: la primera etapa no tiene tramo delante que animar.
    expect(tramos('Requested')).toEqual(['pendiente', 'pendiente', 'pendiente', 'pendiente']);
  });

  it('confirmado: se anima el tramo que lleva al pago', () => {
    expect(tramos('Accepted')).toEqual(['en-marcha', 'pendiente', 'pendiente', 'pendiente']);
  });

  it('pagado: se anima el tramo que lleva al servicio, y el anterior queda sólido', () => {
    expect(tramos('Funded')).toEqual(['solido', 'en-marcha', 'pendiente', 'pendiente']);
  });

  it('en curso: sigue siendo ese mismo tramo el que está pasando', () => {
    expect(tramos('Started')).toEqual(['solido', 'en-marcha', 'pendiente', 'pendiente']);
  });

  it('entregado: se anima el tramo que lleva a la revisión', () => {
    expect(tramos('Submitted')).toEqual(['solido', 'solido', 'en-marcha', 'pendiente']);
  });

  it('nunca hay más de un tramo animado', () => {
    for (const tag of ['Requested', 'Accepted', 'Funded', 'Started', 'Submitted', 'Released'] as Tag[]) {
      expect(enMarcha(tag)).toBeLessThanOrEqual(1);
    }
  });

  it('terminado: todo sólido y nada en marcha', () => {
    expect(tramos('Released')).toEqual(['solido', 'solido', 'solido', 'solido']);
    expect(enMarcha('Released')).toBe(0);
  });

  it('una incidencia no dibuja línea, así que tampoco anima nada', () => {
    for (const tag of ['Disputed', 'Resolved', 'Cancelled'] as Tag[]) {
      const { container } = render(<ProgresoDelServicio job={job(tag)} />);
      expect(container.querySelector('ol')).toBeNull();
      expect(container.querySelector('[data-tramo="en-marcha"]')).toBeNull();
    }
  });
});

describe('lo que la barra dice sigue igual', () => {
  it('mantiene el nombre de la etapa actual y el de la incidencia', () => {
    const { container: enServicio } = render(<ProgresoDelServicio job={job('Funded')} />);
    expect(enServicio.textContent).toContain(ETAPAS_DEL_SERVICIO[2]);

    const { container: disputado } = render(<ProgresoDelServicio job={job('Disputed')} />);
    expect(disputado.textContent).toContain('Problema en revisión');
  });
});
