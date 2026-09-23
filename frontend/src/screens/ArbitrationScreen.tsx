import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Info, Loader2, Lock, Scale } from 'lucide-react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { friendlyError } from '../contractErrors';
import { escrow } from '../escrow';
import { formatSoles } from '../money';
import { direccionCorta, enDisputa, repartoDe } from '../arbitraje/reparto';
import type { Job } from '../../../shared/escrow';

/**
 * Panel interno para resolver disputas. No se enlaza desde ninguna pantalla y pide una
 * clave que vive solo en memoria: recargar obliga a escribirla otra vez, y así no queda
 * en el almacenamiento de un equipo compartido.
 *
 * Quien firma es el árbitro, en el servidor. Aquí solo se elige el reparto.
 */
const TOPE_TRABAJOS = 50;

/** Lee los primeros trabajos en paralelo. `get_job` es simulación: no cuesta comisión. */
async function cargarDisputas(): Promise<Job[]> {
  const leidos = await Promise.all(
    Array.from({ length: TOPE_TRABAJOS }, (_, indice) => BigInt(indice + 1)).map(async id => {
      try {
        return await escrow.getJob(id);
      } catch {
        // Un id que todavía no existe falla; no es un error del panel.
        return null;
      }
    }),
  );
  return leidos.filter((trabajo): trabajo is Job => trabajo !== null && enDisputa(trabajo));
}

function Dato({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return <div className="flex items-baseline justify-between gap-3">
    <dt className="text-sm text-masi-muted">{etiqueta}</dt>
    <dd className={fuerte ? 'text-base font-bold text-masi-navy' : 'text-sm font-semibold text-masi-navy'}>{valor}</dd>
  </div>;
}

function TarjetaDisputa({ trabajo, clave, alResolver }: {
  trabajo: Job;
  clave: string;
  alResolver: (jobId: bigint) => void;
}) {
  const [porcentaje, setPorcentaje] = useState(50);
  const [confirmando, setConfirmando] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState('');
  const [hash, setHash] = useState('');

  const bps = porcentaje * 100;
  const { profesional, cliente } = repartoDe(trabajo.remaining_amount, bps);

  const resolver = async () => {
    setEnCurso(true);
    setError('');
    try {
      const respuesta = await fetch('/api/arbitraje', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-masi-arbitraje': clave },
        body: JSON.stringify({ jobId: trabajo.id.toString(), providerBps: bps }),
      });
      const datos = await respuesta.json() as { hash?: string; error?: { message?: string } };
      if (!respuesta.ok || !datos.hash) throw new Error(datos.error?.message ?? 'No se pudo resolver la disputa.');
      setHash(datos.hash);
      alResolver(trabajo.id);
    } catch (causa) {
      setError(causa instanceof Error && causa.message ? causa.message : friendlyError(causa));
      setConfirmando(false);
    } finally {
      setEnCurso(false);
    }
  };

  if (hash) {
    return <li className="rounded-masi-card border border-masi-success bg-white p-4 shadow-masi-sm">
      <p className="flex items-center gap-2 text-sm font-semibold text-masi-success">
        <CheckCircle2 size={17} aria-hidden="true" />Trabajo #{trabajo.id.toString()} resuelto
      </p>
      <p className="mt-2 text-sm text-masi-muted">
        Al profesional {formatSoles(profesional)} · Al cliente {formatSoles(cliente)}
      </p>
    </li>;
  }

  return <li className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
    <h3 className="text-base font-bold text-masi-navy">Trabajo #{trabajo.id.toString()}</h3>
    <p className="mt-1 text-sm leading-relaxed text-masi-text">{trabajo.description}</p>
    <p className="mt-2 text-xs text-masi-muted">
      Cliente {direccionCorta(trabajo.client)} · Profesional {direccionCorta(trabajo.provider)}
    </p>

    <dl className="mt-4 space-y-2 border-t border-masi-gray pt-3">
      <Dato etiqueta="Total del trabajo" valor={formatSoles(trabajo.amount)} />
      <Dato etiqueta="Adelanto ya entregado" valor={formatSoles(trabajo.materials_amount)} />
      <Dato etiqueta="Saldo en disputa" valor={formatSoles(trabajo.remaining_amount)} fuerte />
    </dl>

    <div className="mt-5 border-t border-masi-gray pt-4">
      <label htmlFor={`reparto-${trabajo.id}`} className="block text-sm font-semibold text-masi-navy">
        Para el profesional: {porcentaje} %
      </label>
      <input
        id={`reparto-${trabajo.id}`}
        type="range"
        min={0}
        max={100}
        step={5}
        value={porcentaje}
        disabled={enCurso}
        onChange={evento => { setPorcentaje(Number(evento.target.value)); setConfirmando(false); }}
        className="mt-3 w-full accent-masi-blue"
      />
      <p className="mt-3 flex items-baseline justify-between gap-3 rounded-masi-input bg-masi-bg p-3 text-sm">
        <span className="font-semibold text-masi-navy">Al profesional {formatSoles(profesional)}</span>
        <span className="font-semibold text-masi-navy">Al cliente {formatSoles(cliente)}</span>
      </p>
    </div>

    {confirmando
      ? <div className="mt-4 rounded-masi-card bg-masi-cream p-3">
        <p className="text-sm text-masi-navy">
          Vas a repartir {formatSoles(trabajo.remaining_amount)}: {formatSoles(profesional)} al
          profesional y {formatSoles(cliente)} al cliente. Esto no se puede deshacer.
        </p>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => { void resolver(); }} disabled={enCurso}>
            {enCurso ? 'Firmando…' : 'Sí, resolver'}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmando(false)} disabled={enCurso}>Cancelar</Button>
        </div>
      </div>
      : <Button className="mt-4" onClick={() => setConfirmando(true)}>Resolver</Button>}

    {error && <p role="alert" className="mt-3 rounded-masi-input bg-masi-blue-50 p-3 text-sm text-masi-error">{error}</p>}
  </li>;
}

export function ArbitrationScreen() {
  const [clave, setClave] = useState('');
  const [entrado, setEntrado] = useState(false);
  const [disputas, setDisputas] = useState<Job[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDisputas(await cargarDisputas());
    } catch (causa) {
      setError(friendlyError(causa));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { if (entrado) void cargar(); }, [entrado, cargar]);

  if (!entrado) {
    return <Screen header={<ScreenHeader title="Arbitraje" subtitle="Panel interno" back={false} />}>
      <form
        className="px-4 py-8"
        onSubmit={evento => { evento.preventDefault(); if (clave.trim()) setEntrado(true); }}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-masi-blue-50 text-masi-blue">
          <Lock size={24} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-masi-navy">Clave del panel</h2>
        <p className="mt-2 text-sm text-masi-muted">
          Este panel resuelve disputas y mueve dinero retenido. No se guarda la clave.
        </p>
        <div className="mt-6">
          <Field
            label="Clave"
            type="password"
            autoComplete="off"
            value={clave}
            onChange={evento => setClave(evento.target.value)}
          />
        </div>
        <Button type="submit" className="mt-6" disabled={!clave.trim()}>Entrar</Button>
      </form>
    </Screen>;
  }

  return <Screen header={<ScreenHeader title="Arbitraje" subtitle="Panel interno" back={false} />}>
    <div className="px-4 py-6">
      <p className="flex gap-2 rounded-masi-card bg-masi-cream p-3 text-sm text-masi-navy">
        <Info size={18} className="shrink-0" aria-hidden="true" />
        <span>
          Solo se reparte el <span className="font-semibold">saldo en disputa</span>. El adelanto de
          materiales ya es del profesional y no vuelve atrás; la comisión de Masi sale aparte.
        </span>
      </p>

      {cargando
        ? <p className="mt-8 flex items-center justify-center gap-2 text-sm text-masi-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />Buscando disputas…
        </p>
        : disputas.length === 0
          ? <div className="mt-8 rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
            <Scale size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
            <p className="mt-3 text-sm font-semibold text-masi-navy">No hay disputas abiertas</p>
            <p className="mt-1 text-sm text-masi-muted">Aquí aparecerán los trabajos que alguien reporte.</p>
          </div>
          : <ul className="mt-6 grid gap-4">
            {disputas.map(trabajo => <TarjetaDisputa
              key={trabajo.id.toString()}
              trabajo={trabajo}
              clave={clave}
              alResolver={() => { void cargar(); }}
            />)}
          </ul>}

      {error && <p role="alert" className="mt-4 rounded-masi-input bg-masi-blue-50 p-3 text-sm text-masi-error">{error}</p>}

      <Button variant="secondary" className="mt-8" onClick={() => { void cargar(); }} disabled={cargando}>
        Actualizar
      </Button>
    </div>
  </Screen>;
}
