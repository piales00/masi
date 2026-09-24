import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CreditCard, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { cn } from '../cn';
import { useDemo } from '../demo/DemoContext';
import { formatSoles } from '../money';
import {
  celularValido, codigoValido, cvcValido, fechaDeConstancia, formatearTarjeta,
  formatearVencimiento, numeroOperacion, soloDigitos, tarjetaValida, vencimientoValido,
} from '../pagoSimulado';

/**
 * Recarga de saldo, como dice el scope: el cobro es simulado y el abono es real.
 *
 * El formulario imita un cobro peruano de verdad —código de aprobación de Yape, o
 * tarjeta— porque nadie escanea un QR desde su propio teléfono. Se valida el formato
 * para que se comporte como una pasarela, pero **nada de lo que se escribe sale del
 * navegador**: la petición solo lleva la cuenta y el monto. Por debajo, la cuenta
 * emisora acredita el saldo en la cadena, y eso sí es real.
 */
const MONTOS = [100, 500, 1200] as const;
const ESPERA_MS = 2000;
const UN_SOL = 10_000_000n;

type Metodo = 'yape' | 'tarjeta';
type Estado = 'formulario' | 'procesando' | 'listo';
interface Constancia { operacion: string; fecha: string; soles: number }

const enSoles = (soles: number) => formatSoles(BigInt(soles) * UN_SOL);

export function RechargeScreen() {
  const { profile } = useDemo();
  const address = profile?.contractId;

  const [monto, setMonto] = useState<number>(MONTOS[0]);
  const [metodo, setMetodo] = useState<Metodo>('yape');
  const [estado, setEstado] = useState<Estado>('formulario');
  const [saldo, setSaldo] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [constancia, setConstancia] = useState<Constancia | null>(null);

  const [celular, setCelular] = useState('');
  const [codigo, setCodigo] = useState('');
  const [titular, setTitular] = useState('');
  const [tarjeta, setTarjeta] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvc, setCvc] = useState('');

  const completo = metodo === 'yape'
    ? celularValido(celular) && codigoValido(codigo)
    : titular.trim().length > 2 && tarjetaValida(tarjeta) && vencimientoValido(vencimiento) && cvcValido(cvc);

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

  const pagar = async () => {
    if (!address || !completo) return;
    setError(null);
    setEstado('procesando');
    // La espera imita la confirmación de un cobro; el abono real suele tardar menos.
    const espera = new Promise(listo => setTimeout(listo, ESPERA_MS));
    try {
      const respuesta = await fetch('/api/recarga', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Solo la cuenta y el monto. Los datos del pago no se envían ni se guardan.
        body: JSON.stringify({ address, soles: monto }),
      });
      const datos = await respuesta.json() as { saldoStroops?: string; error?: { message?: string } };
      await espera;
      if (!respuesta.ok || datos.saldoStroops === undefined) {
        throw new Error(datos.error?.message ?? 'No pudimos acreditar tu saldo.');
      }
      setSaldo(BigInt(datos.saldoStroops));
      setConstancia({ operacion: numeroOperacion(), fecha: fechaDeConstancia(), soles: monto });
      setEstado('listo');
    } catch (fallo) {
      await espera;
      setError(fallo instanceof Error ? fallo.message : 'No pudimos acreditar tu saldo.');
      setEstado('formulario');
    }
  };

  const otraVez = () => {
    setEstado('formulario');
    setConstancia(null);
    setCodigo('');
    setCvc('');
    void leerSaldo();
  };

  if (!address) {
    return <Screen header={<ScreenHeader title="Recargar saldo" />}>
      <div className="px-4 py-10 text-center">
        <p className="text-base text-masi-muted">Crea tu cuenta con tu huella para poder recargar.</p>
      </div>
    </Screen>;
  }

  if (estado === 'listo' && constancia) {
    return <Screen header={<ScreenHeader title="Recargar saldo" back={false} />}>
      <div className="px-4 py-8">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-20 place-items-center rounded-full bg-masi-green-50 text-masi-success">
            <CheckCircle2 size={38} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-bold text-masi-navy">Pago completado</h2>
          <p className="mt-1 text-base text-masi-muted">Tu saldo ya está acreditado.</p>
        </div>

        <dl className="mt-8 rounded-masi-card border border-masi-gray bg-white p-5 shadow-masi-sm">
          <p className="text-center text-3xl font-bold text-masi-navy">{enSoles(constancia.soles)}</p>
          <div className="mt-4 space-y-3 border-t border-masi-gray pt-4 text-sm">
            {[
              ['Concepto', 'Recarga de saldo'],
              ['Fecha y hora', constancia.fecha],
              ['N.º de operación', constancia.operacion],
            ].map(([etiqueta, valor]) => <div key={etiqueta} className="flex items-baseline justify-between gap-3">
              <dt className="text-masi-muted">{etiqueta}</dt>
              <dd className="text-right font-semibold text-masi-navy">{valor}</dd>
            </div>)}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-masi-muted">Saldo disponible</dt>
              <dd className="text-right font-semibold text-masi-navy">{saldo === null ? '—' : formatSoles(saldo)}</dd>
            </div>
          </div>
        </dl>

        <Button className="mt-8" onClick={otraVez}>Recargar de nuevo</Button>
      </div>
    </Screen>;
  }

  return <Screen header={<ScreenHeader title="Recargar saldo" />}>
    <div className="px-4 py-6">
      <section className="rounded-masi-card bg-masi-navy p-5 text-white shadow-masi-sm">
        <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">Monto a pagar</p>
        <p className="mt-1 text-4xl font-bold">{enSoles(monto)}</p>
        <p className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3 text-xs text-white/80">
          <ShieldCheck size={15} aria-hidden="true" className="shrink-0" />
          Tu dinero queda protegido hasta que apruebes el trabajo.
        </p>
      </section>

      <p className="mt-3 text-center text-sm text-masi-muted">
        Saldo actual: <span className="font-semibold text-masi-navy">{saldo === null ? '—' : formatSoles(saldo)}</span>
      </p>

      <h2 className="mt-6 text-sm font-semibold text-masi-navy">¿Cuánto quieres recargar?</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {MONTOS.map(valor => <button
          key={valor}
          onClick={() => setMonto(valor)}
          aria-pressed={monto === valor}
          disabled={estado === 'procesando'}
          className={cn(
            'min-h-12 rounded-full px-3 text-base font-semibold transition-colors duration-200 ease-out',
            monto === valor ? 'bg-masi-blue text-white' : 'border border-masi-gray bg-white text-masi-navy',
          )}
        >{enSoles(valor)}</button>)}
      </div>

      <section className="mt-6 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h2 className="text-base font-bold text-masi-navy">Método de pago</h2>

        <div role="tablist" aria-label="Método de pago" className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-masi-bg p-1">
          {([['yape', 'Yape', Smartphone], ['tarjeta', 'Tarjeta', CreditCard]] as const).map(([id, texto, Icono]) => <button
            key={id}
            role="tab"
            aria-selected={metodo === id}
            onClick={() => { setMetodo(id); setError(null); }}
            disabled={estado === 'procesando'}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors duration-200 ease-out',
              metodo === id ? 'bg-white text-masi-navy shadow-masi-sm' : 'text-masi-muted',
            )}
          ><Icono size={16} aria-hidden="true" />{texto}</button>)}
        </div>

        <div className="mt-4 grid gap-4">
          {metodo === 'yape' ? <>
            <Field
              label="Número de celular"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="987 654 321"
              value={celular}
              onChange={evento => setCelular(soloDigitos(evento.target.value).slice(0, 9))}
            />
            <Field
              label="Código de aprobación"
              inputMode="numeric"
              placeholder="6 dígitos"
              hint="Ábrelo en tu app de Yape, en “Código de aprobación”."
              value={codigo}
              onChange={evento => setCodigo(soloDigitos(evento.target.value).slice(0, 6))}
            />
          </> : <>
            <Field
              label="Nombre en la tarjeta"
              autoComplete="cc-name"
              placeholder="Ej. María Torres"
              value={titular}
              onChange={evento => setTitular(evento.target.value)}
            />
            <Field
              label="Número de tarjeta"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              value={tarjeta}
              onChange={evento => setTarjeta(formatearTarjeta(evento.target.value))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Vencimiento"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                value={vencimiento}
                onChange={evento => setVencimiento(formatearVencimiento(evento.target.value))}
              />
              <Field
                label="CVC"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                value={cvc}
                onChange={evento => setCvc(soloDigitos(evento.target.value).slice(0, 4))}
              />
            </div>
          </>}
        </div>

        <p className="mt-5 flex items-baseline justify-between gap-3 border-t border-masi-gray pt-4">
          <span className="text-sm text-masi-muted">Total a pagar</span>
          <strong className="text-2xl font-bold text-masi-navy">{enSoles(monto)}</strong>
        </p>

        <Button className="mt-4" onClick={() => { void pagar(); }} disabled={!completo || estado === 'procesando'}>
          {estado === 'procesando' ? 'Confirmando pago…' : 'Confirmar pago'}
          {estado !== 'procesando' && <ArrowRight size={18} aria-hidden="true" />}
        </Button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-masi-muted">
          <Lock size={13} aria-hidden="true" className="shrink-0" />
          Tus datos de pago no se guardan.
        </p>
      </section>

      {error && <p role="alert" className="mt-4 rounded-masi-card border border-masi-error/30 bg-white p-3 text-sm text-masi-error">{error}</p>}
    </div>
  </Screen>;
}
