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
  let logins: string[] = [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(`masi.logins.${contractId}`) || '[]');
    if (Array.isArray(stored)) logins = stored.filter((item): item is string => typeof item === 'string' && Number.isFinite(Date.parse(item))).slice(0, 10);
  } catch { /* Historial opcional del navegador. */ }
  return <section className="mt-6 rounded-masi-card border border-masi-gray bg-white p-4 text-sm text-masi-navy">
    <details>
      <summary className="cursor-pointer font-semibold">Ver detalles de tu registro</summary>
      <p className="mt-3 text-xs text-masi-muted">Dirección de cuenta</p>
      <p className="break-all font-mono text-xs">{contractId}</p>
      <p className="mt-3 text-xs text-masi-muted">Últimos accesos en este navegador (no incluye otros dispositivos)</p>
      {logins.length ? <ul className="mt-2 space-y-1 text-xs">{logins.map((date, index) => <li key={`${date}-${index}`}>{new Date(date).toLocaleString('es-PE')}</li>)}</ul>
        : <p className="mt-2 text-xs">Todavía no hay accesos guardados. Se registran desde esta versión.</p>}
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
