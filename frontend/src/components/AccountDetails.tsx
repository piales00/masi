import { useState } from 'react';
import { hasPendingAccount, resumeAccountCreation } from '../passkeys';

export function AccountDetails({ contractId, deploymentHash }: { contractId?: string; deploymentHash?: string }) {
  const [pending, setPending] = useState(hasPendingAccount);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const receipt = await resumeAccountCreation();
      setPending(!receipt.confirmed);
      setMessage(receipt.confirmed ? 'Tu registro quedó verificado.' : 'La verificación sigue pendiente. Reintenta más tarde.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No se pudo verificar todavía.');
    } finally {
      setBusy(false);
    }
  };

  if (!contractId) return null;
  return <section className="mt-6 rounded-masi-card border border-masi-gray bg-white p-4 text-sm text-masi-navy">
    <details>
      <summary className="cursor-pointer font-semibold">Ver detalles de tu registro</summary>
      <p className="mt-3 text-xs text-masi-muted">Dirección de cuenta</p>
      <p className="break-all font-mono text-xs">{contractId}</p>
      {deploymentHash && <a className="mt-3 block break-all text-xs text-masi-blue underline" target="_blank" rel="noreferrer"
        href={`https://stellar.expert/explorer/testnet/tx/${deploymentHash}`}>Ver comprobante de registro</a>}
    </details>
    {pending && <div className="mt-3">
      <p>Hay una verificación de registro pendiente en este navegador.</p>
      <button type="button" disabled={busy} onClick={finish} className="mt-2 font-semibold text-masi-blue underline">
        {busy ? 'Verificando…' : 'Terminar verificación'}
      </button>
    </div>}
    {message && <p role="status" className="mt-3">{message}</p>}
  </section>;
}
