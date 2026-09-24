import { useEffect, useRef } from 'react';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DURACION_AVISO_ELEGIDO_MS, useTeEligieron } from '../useTeEligieron';
import type { Eleccion } from '../useTeEligieron';
import { serviceOf } from '../trades';

/**
 * «Te eligieron», arriba y sin tapar nada.
 *
 * Es un aviso, no una pantalla: no atenúa el fondo, no bloquea, se puede cerrar y se va
 * solo. Va arriba a propósito, para no confundirse con la tarjeta de nuevas solicitudes,
 * que vive abajo y significa otra cosa.
 */
function Banner({ eleccion, onCerrar }: { eleccion: Eleccion; onCerrar: () => void }) {
  const navigate = useNavigate();
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    const reloj = setTimeout(() => cerrar.current(), DURACION_AVISO_ELEGIDO_MS);
    return () => { clearTimeout(reloj); };
  }, []);

  const Icono = serviceOf(eleccion.servicio).icon;

  return <div className="pointer-events-none absolute inset-x-0 top-0 z-40 p-3">
    <section
      role="status"
      className="pointer-events-auto rounded-masi-card border border-masi-blue bg-masi-blue-50 p-3 shadow-masi-md animate-masi-bajar"
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle2 size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-masi-blue" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-masi-navy">¡Te eligieron para el servicio!</p>
          <p className="mt-0.5 text-sm text-masi-navy">El cliente seleccionó tu propuesta.</p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-masi-blue">
            <Icono size={13} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 break-words">{eleccion.servicio}</span>
            {eleccion.distrito && <span className="text-masi-muted">· {eleccion.distrito}</span>}
          </p>
          <button
            type="button"
            onClick={() => { onCerrar(); navigate(eleccion.destino); }}
            className="mt-2 flex min-h-10 items-center gap-1 text-sm font-bold text-masi-blue underline-offset-4 hover:underline"
          >Enviar cotización final<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="grid size-9 shrink-0 place-items-center rounded-full text-masi-navy transition-colors duration-200 ease-out hover:bg-white"
        ><X size={17} aria-hidden="true" /></button>
      </div>
    </section>
  </div>;
}

/** Un aviso a la vez, y solo para el profesional: es su propuesta la que eligen. */
export function AvisoDeEleccion() {
  const { eleccion, cerrar } = useTeEligieron();
  if (!eleccion) return null;
  return <Banner key={eleccion.solicitudId} eleccion={eleccion} onCerrar={cerrar} />;
}
