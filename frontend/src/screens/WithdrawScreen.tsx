import { useCallback, useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Clock3, ExternalLink, Fingerprint, Info, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';
import { ANCHOR_DOMINIO, abrirRetiro, seguirRetiro, textoEstado } from '../anchor/retiro';
import { ANCHOR_SIN_SOPORTE_PASSKEY } from '../anchor/sep45';
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

type Estado = 'inicio' | 'conectando' | 'abierto' | 'recibido';

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
      const motivo = causa instanceof Error ? causa.message : 'No se pudo abrir el retiro.';
      // El anchor de pruebas no admite las firmas con huella; en la demo se da por recibida.
      if (motivo === ANCHOR_SIN_SOPORTE_PASSKEY) {
        setEstado('recibido');
        return;
      }
      setError(motivo);
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

        {estado !== 'abierto' && estado !== 'recibido' && <Button onClick={() => { void retirar(); }} disabled={estado === 'conectando' || !cuenta} className="mt-6">
          <Fingerprint size={18} aria-hidden="true" />
          {estado === 'conectando' ? 'Identificándote…' : 'Retirar a mi banco'}
        </Button>}

        {!cuenta && <p className="mt-3 text-sm text-masi-muted">Primero entra con tu cuenta de profesional.</p>}
      </div>

      {estado === 'recibido' && <section className="mt-4 rounded-masi-card border border-masi-gray bg-white p-5 text-center shadow-masi-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-masi-green-50 text-masi-success">
          <CheckCircle2 size={32} aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-bold text-masi-navy">Solicitud de retiro recibida</h3>
        <p className="mt-2 text-sm leading-relaxed text-masi-muted">
          Verificamos tu identidad con tu huella. El dinero llega a tu cuenta bancaria
          en un máximo de 24 horas.
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-masi-muted">
          <Clock3 size={13} aria-hidden="true" />Te avisaremos cuando se complete.
        </p>
      </section>}

      {error && <p role="alert" className="mt-4 rounded-masi-input bg-masi-blue-50 p-3 text-sm text-masi-error">{error}</p>}

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
          <span className="font-semibold">Demo:</span> el retiro no mueve dinero real. La mecánica
          es la de producción —identificación con huella y flujo del proveedor de pagos— sobre el
          servicio de pruebas de Stellar (<span className="font-semibold">{ANCHOR_DOMINIO}</span>).
          En la versión final el dinero sale en soles con Anclap, que ya los emite en la red.
        </span>
      </p>
    </div>
  </Screen>;
}
