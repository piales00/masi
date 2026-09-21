import { useState } from 'react';
import { Bell, MapPin, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { useDemo } from '../demo/DemoContext';
import { hasPendingAccount, resumeAccountCreation } from '../passkeys';

export function HomeScreen() {
  const { profile, reset } = useDemo();
  const navigate = useNavigate();
  const [pending, setPending] = useState(hasPendingAccount);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const finishConfirmation = async () => {
    try {
      const receipt = await resumeAccountCreation();
      if (receipt.confirmed) {
        setPending(false);
        setConfirmationMessage('Tu registro quedó verificado.');
      } else {
        setConfirmationMessage('Tu cuenta ya existe; la verificación local sigue pendiente. Reintenta más tarde.');
      }
    } catch (cause) {
      setConfirmationMessage(cause instanceof Error ? cause.message : 'No se pudo verificar todavía.');
    }
  };

  /**
   * Provisional aquí hasta que exista la pestaña Perfil. Va a /bienvenida y no a /splash
   * porque al quedarse sin perfil RequireProfile redirige ahí de todos modos.
   */
  const restart = () => {
    reset();
    navigate('/bienvenida', { replace: true });
  };

  return <Screen header={
    <header className="shrink-0 border-b border-masi-gray bg-white px-4 pt-[calc(0.75rem+var(--masi-safe-top))] pb-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl leading-tight font-bold text-masi-navy">Hola, {profile?.firstName}</h1>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-masi-muted">
            <MapPin size={13} aria-hidden="true" />{profile?.district}
          </p>
        </div>
        <button
          aria-label="Notificaciones"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-masi-bg text-masi-navy transition-colors duration-200 ease-out hover:bg-masi-blue-50"
        ><Bell size={20} aria-hidden="true" /></button>
      </div>
    </header>
  }>
    <div className="px-4 py-6">
      <h2 className="text-2xl leading-tight font-bold text-masi-navy">
        {profile?.role === 'profesional' ? 'Tu cuenta profesional está lista' : '¿Qué necesitas resolver hoy?'}
      </h2>
      {profile?.contractId && <section className="mt-6 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h3 className="text-base font-bold text-masi-navy">Tu registro en Stellar</h3>
        <p className="mt-2 text-xs text-masi-muted">Dirección de cuenta</p>
        <p className="break-all font-mono text-xs text-masi-text">{profile.contractId}</p>
        {profile.deploymentHash && <>
          <p className="mt-3 text-xs text-masi-muted">Comprobante de registro</p>
          <a className="break-all text-xs font-semibold text-masi-blue underline" target="_blank" rel="noreferrer"
            href={`https://stellar.expert/explorer/testnet/tx/${profile.deploymentHash}`}>
            {profile.deploymentHash}
          </a>
        </>}
      </section>}
      {pending && profile?.contractId && <div className="mt-4 rounded-masi-input bg-masi-cream p-4 text-sm text-masi-navy">
        <p>Tu cuenta ya fue registrada. Falta terminar una verificación en este navegador antes de crear otra.</p>
        <button onClick={finishConfirmation} className="mt-2 font-semibold text-masi-blue underline">Terminar verificación</button>
      </div>}
      {confirmationMessage && <p role="status" className="mt-3 text-sm text-masi-navy">{confirmationMessage}</p>}
      <button
        onClick={restart}
        className="mt-8 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-masi-blue transition-colors duration-200 ease-out hover:bg-masi-blue-50"
      ><RotateCcw size={16} aria-hidden="true" />Reiniciar demo</button>
    </div>
  </Screen>;
}
