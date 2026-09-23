import { useCallback, useEffect, useState } from 'react';
import { Banknote, ExternalLink, Fingerprint, Info, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';
import { ANCHOR_DOMINIO, abrirRetiro, seguirRetiro, textoEstado } from '../anchor/retiro';
import { RETIRO_NO_DISPONIBLE } from '../anchor/sep45';
import type { SesionRetiro } from '../anchor/retiro';
import { signAuthEntry } from '../passkeys';

/**
 * Retiro a una cuenta bancaria, por SEP-24, con identificación SEP-45.
 *
 * El profesional se identifica con su huella —su cuenta es un contrato, no una cuenta
 * clásica— y el anchor abre su propia ventana para el KYC y los datos del banco. Masi
 * no ve ni guarda nada de eso, que es justo el motivo de delegarlo en un anchor.
 */
const CADA_MS = 4000;

type Estado = 'inicio' | 'conectando' | 'abierto';

export function WithdrawScreen() {
  const { providerProfile } = useDemo();
  const cuenta = providerProfile?.contractId;
  const [estado, setEstado] = useState<Estado>('inicio');
  const [sesion, setSesion] = useState<SesionRetiro | null>(null);
  const [situacion, setSituacion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retirar = async () => {
    if (!cuenta) return;
    setError(null);
    setEstado('conectando');
    try {
      const abierta = await abrirRetiro(cuenta, (entrada, expiracion) => signAuthEntry(entrada, cuenta, expiracion));
      setSesion(abierta);
      setEstado('abierto');
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir el retiro.');
      setEstado('inicio');
    }
  };

  const consultar = useCallback(async (actual: SesionRetiro) => {
    try {
      const transaccion = await seguirRetiro(actual);
      setSituacion(textoEstado(transaccion.status));
    } catch {
      // El estado es informativo: si el anchor no responde, la ventana sigue abierta.
    }
  }, []);

  useEffect(() => {
    if (!sesion) return;
    void consultar(sesion);
    const reloj = setInterval(() => void consultar(sesion), CADA_MS);
    return () => clearInterval(reloj);
  }, [sesion, consultar]);

  return <Screen header={<ScreenHeader title="Retirar tu dinero" />}>
    <div className="px-4 py-6">
      <div className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <span className="grid size-12 place-items-center rounded-2xl bg-masi-blue-50 text-masi-blue">
          <Banknote size={24} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-masi-navy">Pasa tu dinero a tu cuenta bancaria</h2>
        <p className="mt-2 text-sm leading-relaxed text-masi-muted">
          Te identificas con tu huella y completas tus datos en la ventana segura de quien hace
          el envío. Masi no ve tu número de cuenta ni tus documentos.
        </p>

        {estado !== 'abierto' && <Button onClick={() => { void retirar(); }} disabled={estado === 'conectando' || !cuenta} className="mt-6">
          <Fingerprint size={18} aria-hidden="true" />
          {estado === 'conectando' ? 'Identificándote…' : 'Retirar a mi banco'}
        </Button>}

        {!cuenta && <p className="mt-3 text-sm text-masi-muted">Primero entra con tu cuenta de profesional.</p>}
      </div>

      {/*
        * Que el proveedor de pagos no admita todavía las cuentas con huella no es una avería:
        * se avisa en tono informativo, no en rojo, y sin prometer un envío que no va a ocurrir.
        */}
      {error && (error === RETIRO_NO_DISPONIBLE
        ? <p role="status" className="mt-4 flex gap-2 rounded-masi-card bg-masi-cream p-3 text-sm text-masi-navy">
          <Info size={18} className="shrink-0" aria-hidden="true" />{error}
        </p>
        : <p role="alert" className="mt-4 rounded-masi-input bg-masi-blue-50 p-3 text-sm text-masi-error">{error}</p>)}

      {sesion && <section className="mt-4 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h3 className="text-sm font-semibold text-masi-navy">Tu retiro</h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-masi-muted">
          <RefreshCw size={14} aria-hidden="true" />{situacion ?? 'Consultando…'}
        </p>
        <a
          href={sesion.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-masi-input bg-masi-blue px-4 py-3 text-sm font-bold text-white transition-colors duration-200 ease-out hover:bg-masi-navy"
        >
          Abrir la ventana segura<ExternalLink size={16} aria-hidden="true" />
        </a>
        <p className="mt-2 text-center text-xs text-masi-muted">Se abre en una pestaña nueva.</p>
      </section>}

      <p className="mt-8 flex gap-2 rounded-masi-card bg-masi-cream p-3 text-sm text-masi-navy">
        <Info size={18} className="shrink-0" aria-hidden="true" />
        <span>
          Esta es la mecánica real de retiro, conectada al servicio de pruebas de Stellar
          (<span className="font-semibold">{ANCHOR_DOMINIO}</span>). En la versión final el dinero
          sale en soles con Anclap, que ya los emite en la red. Cambia el proveedor, no el código.
        </span>
      </p>
    </div>
  </Screen>;
}
