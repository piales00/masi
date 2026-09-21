import { ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';
import type { Postulacion, Solicitud } from '../demo/DemoContext';
import { serviceOf } from '../trades';

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function estadoTexto(solicitud: Solicitud, propuestas: Postulacion[]): string {
  if (solicitud.estado === 'profesional_elegido') {
    const elegida = propuestas.find(item => item.id === solicitud.postulacionElegidaId);
    return elegida ? `Elegiste a ${elegida.providerNombre}` : 'Profesional elegido';
  }
  if (propuestas.length === 0) return 'Esperando propuestas';
  return propuestas.length === 1 ? '1 propuesta recibida' : `${propuestas.length} propuestas recibidas`;
}

export function RequestsScreen() {
  const { clienteId, solicitudes, postulaciones } = useDemo();
  const navigate = useNavigate();

  const mias = solicitudes.filter(item => item.clienteId === clienteId);

  return <Screen header={<ScreenHeader title="Solicitudes" back={false} />}>
    <div className="px-4 py-6">
      {mias.length === 0
        ? <div className="rounded-masi-card border border-dashed border-masi-gray bg-white px-6 py-10 text-center">
          <ClipboardList size={30} aria-hidden="true" className="mx-auto text-masi-blue" />
          <p className="mt-3 text-sm text-masi-muted">Aquí verás las solicitudes que publiques y las propuestas que recibas.</p>
        </div>
        : <ul className="grid gap-3 lg:grid-cols-2">
          {mias.map(solicitud => {
            const propuestas = postulaciones.filter(item => item.solicitudId === solicitud.id);
            const Icon = serviceOf(solicitud.servicio).icon;
            const elegido = solicitud.estado === 'profesional_elegido';
            return <li key={solicitud.id}>
              <button
                onClick={() => navigate(`/solicitudes/${solicitud.id}`)}
                className="w-full rounded-masi-card border border-masi-gray bg-white p-4 text-left shadow-masi-sm transition-colors duration-200 ease-out hover:border-masi-blue"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-masi-blue">
                    <Icon size={15} aria-hidden="true" />{solicitud.servicio}
                  </p>
                  <span className={elegido
                    ? 'shrink-0 rounded-full bg-masi-green-50 px-3 py-1 text-xs font-semibold text-masi-navy'
                    : 'shrink-0 rounded-full bg-masi-blue-50 px-3 py-1 text-xs font-semibold text-masi-navy'}
                  >{estadoTexto(solicitud, propuestas)}</span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-masi-text">{solicitud.descripcion}</p>

                <p className="mt-3 border-t border-masi-gray pt-3 text-xs text-masi-muted">{formatDate(solicitud.creadaEn)}</p>
              </button>
            </li>;
          })}
        </ul>}
    </div>
  </Screen>;
}
