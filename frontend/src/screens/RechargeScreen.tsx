import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Info, Wallet } from 'lucide-react';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';
import { formatSoles } from '../money';

/**
 * Recarga simulada, como dice el scope. En producción esto lo haría un anchor por
 * SEP-24: el usuario paga en soles en la ventana del anchor y recibe el saldo. Aquí
 * el pago es un dibujo y dos segundos de espera; por debajo, la cuenta emisora
 * acredita el monto de verdad en la cadena. La pantalla lo dice sin esconderlo.
 */
const MONTOS = [100, 500, 1200] as const;
const ESPERA_MS = 2000;

type Estado = 'elegir' | 'confirmando' | 'listo';

/** QR dibujado: no codifica nada, solo da el aire de una pantalla de pago. */
function QrDibujado() {
  const celdas = Array.from({ length: 49 }, (_, i) => ((i * 7 + (i % 5) * 3) % 11) < 5);
  return <div aria-hidden="true" className="grid size-40 grid-cols-7 gap-1 rounded-masi-card bg-white p-3 shadow-masi-sm">
    {celdas.map((lleno, i) => <span key={i} className={lleno ? 'rounded-[2px] bg-masi-navy' : 'rounded-[2px] bg-masi-gray/50'} />)}
  </div>;
}

export function RechargeScreen() {
  const { profile } = useDemo();
  const address = profile?.contractId;
  const [monto, setMonto] = useState<number>(MONTOS[0]);
  const [estado, setEstado] = useState<Estado>('elegir');
  const [saldo, setSaldo] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leerSaldo = useCallback(async () => {
    if (!address) return;
    try {
      const respuesta = await fetch(`/api/recarga?address=${encodeURIComponent(address)}`);
      const datos = await respuesta.json() as { saldoStroops?: string };
      if (datos.saldoStroops !== undefined) setSaldo(BigInt(datos.saldoStroops));
    } catch {
      // El saldo es informativo: si no carga, la recarga sigue siendo posible.
    }
  }, [address]);

  useEffect(() => { void leerSaldo(); }, [leerSaldo]);

  const recargar = async () => {
    if (!address) return;
    setError(null);
    setEstado('confirmando');
    // La espera es parte de la simulación: imita la confirmación de un pago por QR.
    const espera = new Promise(listo => setTimeout(listo, ESPERA_MS));
    try {
      const respuesta = await fetch('/api/recarga', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, soles: monto }),
      });
      const datos = await respuesta.json() as { saldoStroops?: string; error?: { message?: string } };
      await espera;
      if (!respuesta.ok || datos.saldoStroops === undefined) {
        throw new Error(datos.error?.message ?? 'No pudimos acreditar tu saldo.');
      }
      setSaldo(BigInt(datos.saldoStroops));
      setEstado('listo');
    } catch (fallo) {
      await espera;
      setError(fallo instanceof Error ? fallo.message : 'No pudimos acreditar tu saldo.');
      setEstado('elegir');
    }
  };

  if (!address) {
    return <Screen header={<ScreenHeader title="Recargar" />}>
      <div className="px-4 py-10 text-center">
        <p className="text-base text-masi-muted">Crea tu cuenta con tu huella para poder recargar.</p>
      </div>
    </Screen>;
  }

  return <Screen
    header={<ScreenHeader title="Recargar" subtitle="Simulación para la demo" />}
    footer={estado !== 'listo' ? <ScreenFooter className="bg-white">
      <Button onClick={() => { void recargar(); }} disabled={estado === 'confirmando'}>
        {estado === 'confirmando' ? 'Confirmando pago…' : `Ya pagué ${formatSoles(BigInt(monto) * 10_000_000n)}`}
      </Button>
    </ScreenFooter> : null}
  >
    <div className="px-4 py-6">
      <div className="flex items-center gap-3 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-masi-blue-50 text-masi-blue">
          <Wallet size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-masi-muted">Tu saldo</p>
          <p className="text-xl font-bold text-masi-navy">{saldo === null ? '—' : formatSoles(saldo)}</p>
        </div>
      </div>

      {estado === 'listo' ? <div className="mt-8 flex flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-full bg-masi-green-50 text-masi-success">
          <CheckCircle2 size={38} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-masi-navy">¡Listo! Tu saldo está acreditado.</h2>
        <p className="mt-2 text-base text-masi-muted">Ya puedes pagar tu trabajo con el dinero protegido.</p>
        <Button className="mt-8" onClick={() => { setEstado('elegir'); void leerSaldo(); }}>Recargar de nuevo</Button>
      </div> : <>
        <h2 className="mt-8 text-lg font-bold text-masi-navy">¿Cuánto quieres recargar?</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {MONTOS.map(valor => <button
            key={valor}
            onClick={() => setMonto(valor)}
            aria-pressed={monto === valor}
            disabled={estado === 'confirmando'}
            className={monto === valor
              ? 'min-h-12 rounded-full bg-masi-blue px-3 text-base font-semibold text-white'
              : 'min-h-12 rounded-full border border-masi-gray bg-white px-3 text-base font-semibold text-masi-navy'}
          >{formatSoles(BigInt(valor) * 10_000_000n)}</button>)}
        </div>

        <div className="mt-8 flex flex-col items-center">
          <QrDibujado />
          <p className="mt-3 text-sm text-masi-muted">
            {estado === 'confirmando' ? 'Confirmando pago…' : 'Escanea el código con tu app de pagos'}
          </p>
        </div>

        {error && <p role="alert" className="mt-6 rounded-masi-card border border-masi-error/30 bg-white p-3 text-sm text-masi-error">{error}</p>}

        <p className="mt-8 flex gap-2 rounded-masi-card bg-masi-cream p-3 text-sm text-masi-navy">
          <Info size={18} className="shrink-0" aria-hidden="true" />
          <span>Esta recarga es una simulación. En la versión real pagarías con Yape o transferencia y recibirías el mismo saldo.</span>
        </p>
      </>}
    </div>
  </Screen>;
}
