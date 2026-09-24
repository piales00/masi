import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { DURACION_AVISO_MS, useNovedades } from '../useNovedades';
import type { Aviso } from '../useNovedades';
import type { Role } from '../demo/DemoContext';
import { serviceOf } from '../trades';

const reloj = (restante: number): string => {
  const segundos = Math.ceil(restante / 1000);
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
};

/**
 * La tarjeta del aviso, con su cuenta atrás.
 *
 * El reloj vive aquí y no en el contexto a propósito: así el segundero solo repinta esta
 * tarjeta y no la aplicación entera. La barra se mueve con una transición de un segundo,
 * que es continua a la vista y se apaga sola con `prefers-reduced-motion`.
 */
function TarjetaDeAviso({ aviso, onCerrar }: { aviso: Aviso; onCerrar: () => void }) {
  const navigate = useNavigate();
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;
  const [restante, setRestante] = useState(DURACION_AVISO_MS);

  useEffect(() => {
    const fin = Date.now() + DURACION_AVISO_MS;
    const tic = setInterval(() => {
      const queda = Math.max(0, fin - Date.now());
      setRestante(queda);
      // Se acabó el tiempo en pantalla: se cierra la tarjeta y nada más.
      if (queda <= 0) cerrarRef.current();
    }, 1000);
    return () => { clearInterval(tic); };
  }, []);

  const servicio = serviceOf(aviso.servicio);
  const Icono = servicio.icon;
  const esSolicitud = aviso.tipo === 'solicitud';
  const cuantos = aviso.nombres.length;

  return <div aria-live="polite" className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center bg-masi-navy/20 p-3">
    <section className="pointer-events-auto w-full max-w-md overflow-hidden rounded-masi-card border border-masi-gray bg-white shadow-masi-lg animate-masi-rise">
      <div className="h-1 w-full bg-masi-blue-50">
        <div
          className="h-full rounded-r-full bg-masi-blue ease-linear motion-safe:transition-[width] motion-safe:duration-1000"
          style={{ width: `${(restante / DURACION_AVISO_MS) * 100}%` }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-base font-bold break-words text-masi-navy">
            {esSolicitud ? 'Nueva solicitud cerca de ti' : 'Nuevas postulaciones'}
          </h2>
          <span className="shrink-0 rounded-full bg-masi-blue-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-masi-navy">
            {reloj(restante)}
          </span>
        </div>

        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-masi-blue">
          <Icono size={15} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 break-words">{aviso.servicio}</span>
          {aviso.distrito && <span className="text-masi-muted">· {aviso.distrito}</span>}
        </p>

        {esSolicitud
          ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-masi-text">{aviso.descripcion}</p>
          : <div className="mt-1.5 flex items-center gap-3">
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-masi-text">
              {cuantos === 1 ? '1 profesional ha enviado' : `${cuantos} profesionales han enviado`} una propuesta.
            </p>
            <span className="flex shrink-0 -space-x-2">
              {aviso.nombres.slice(0, 3).map((nombre, indice) => <Avatar
                key={`${nombre}-${indice}`}
                name={nombre}
                size="sm"
                className="size-8 text-xs ring-2 ring-white"
              />)}
            </span>
          </div>}

        <Button className="mt-4" onClick={() => { onCerrar(); navigate(aviso.destino); }}>
          {esSolicitud ? 'Ver solicitud' : 'Revisar postulaciones'}
        </Button>
        <button
          type="button"
          onClick={onCerrar}
          className="mt-2 min-h-10 w-full text-sm font-semibold text-masi-muted underline-offset-4 hover:text-masi-navy hover:underline"
        >Ahora no</button>
      </div>
    </section>
  </div>;
}

/**
 * Un único aviso a la vez, encima del contenido y nunca debajo de la navegación: vive
 * dentro de la columna de contenido, así que la cápsula inferior sigue a la vista y
 * utilizable. El fondo se atenúa pero no bloquea: quien esté escribiendo una cotización
 * no se queda media pantalla sin poder tocar nada durante medio minuto.
 */
export function AvisoDeNovedades({ role }: { role: Role }) {
  const { aviso, cerrar } = useNovedades(role);
  if (!aviso) return null;
  // La clave es el aviso, no su contenido: si llegan más postulaciones de la misma
  // solicitud se actualiza la tarjeta y el reloj sigue donde estaba.
  return <TarjetaDeAviso key={aviso.id} aviso={aviso} onCerrar={cerrar} />;
}
