import { describe, expect, it, vi } from 'vitest';
import type { Job } from '../../../shared/escrow';
import { createContractEscrow, type EscrowContract } from './contractEscrow';

const JOB = { id: 7n, state: { tag: 'Funded', values: undefined } } as unknown as Job;
const ADDRESS = 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526';

/** El contrato devuelve Result<T, Error>; según los bindings llega envuelto o plano. */
const tx = <T>(result: T) => Promise.resolve({ result } as never);
const txEnvuelto = <T>(result: T) => Promise.resolve({ result: { unwrap: () => result } } as never);

function almacenFalso() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

// `null` = sin cuenta conectada. Con `undefined` se activaría el valor por defecto.
function montar(contrato: Partial<EscrowContract>, address: string | null = ADDRESS) {
  const firmarYEnviar = vi.fn<(tx: unknown, address: string) => Promise<string>>(async () => 'hash-de-prueba');
  const escrow = createContractEscrow({
    cliente: async () => contrato as EscrowContract,
    firmarYEnviar,
    direccion: async () => address ?? undefined,
    almacen: almacenFalso(),
  });
  return { escrow, firmarYEnviar };
}

describe('contractEscrow', () => {
  it('lee un trabajo tanto si el resultado viene envuelto como si no', async () => {
    const plano = montar({ get_job: () => tx(JOB) });
    const envuelto = montar({ get_job: () => txEnvuelto(JOB) });
    expect((await plano.escrow.getJob(7n)).id).toBe(7n);
    expect((await envuelto.escrow.getJob(7n)).id).toBe(7n);
  });

  it('firma cada acción con la cuenta conectada y devuelve el hash', async () => {
    const { escrow, firmarYEnviar } = montar({ fund: () => tx(null) });
    expect(await escrow.fund(7n)).toEqual({ hash: 'hash-de-prueba' });
    expect(firmarYEnviar.mock.calls[0][1]).toBe(ADDRESS);
  });

  it('sin cuenta conectada responde como el contrato: no autorizado', async () => {
    const { escrow, firmarYEnviar } = montar({ fund: () => tx(null) }, null);
    await expect(escrow.fund(7n)).rejects.toThrow('Error(Contract, #5)');
    expect(firmarYEnviar).not.toHaveBeenCalled();
  });

  it('createJob toma el id de la simulación y lo recuerda para el cliente', async () => {
    const contrato = {
      create_job: () => tx(9n),
      jobs_of: () => tx([] as bigint[]),
      get_job: () => tx({ ...JOB, id: 9n } as Job),
    };
    const { escrow } = montar(contrato);
    expect(await escrow.createJob({} as never)).toEqual({ jobId: 9n, hash: 'hash-de-prueba' });
    // jobs_of solo indexa por proveedor: el trabajo del cliente sale del índice local.
    expect((await escrow.jobsOf(ADDRESS)).map(job => job.id)).toEqual([9n]);
  });

  it('une los trabajos del contrato con los del índice, sin repetirlos', async () => {
    const { escrow } = montar({
      create_job: () => tx(4n),
      jobs_of: () => tx([4n, 5n]),
      get_job: ({ job_id }) => tx({ ...JOB, id: job_id } as Job),
    });
    await escrow.createJob({} as never);
    expect((await escrow.jobsOf(ADDRESS)).map(job => job.id)).toEqual([5n, 4n]);
  });

  it('resolve no la firma un usuario de la app', async () => {
    const { escrow } = montar({});
    await expect(escrow.resolve(7n, 5000)).rejects.toThrow('árbitro');
  });
});
