import type { ReactNode } from 'react';
import { BadgeCheck, Briefcase, CheckCircle2, Clock3, MapPin, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AvatarProfesional } from '../components/AvatarProfesional';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDemo } from '../demo/DemoContext';
import { formatPrice, formatRating } from '../marketplace';
import { serviceOf } from '../trades';
import { useMarketplace } from '../useMarketplace';
import { useProviderRating } from '../useProviderRatings';
import { useResenasDeProfesional } from '../useResenasDeProfesional';

function Dato({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return <p className="flex items-center gap-1.5 text-sm text-masi-muted">
    <Icon size={14} aria-hidden="true" className="shrink-0" />{children}
  </p>;
}

export function ProposalDetailScreen() {
  const { id, postulacionId } = useParams();
  const navigate = useNavigate();
  const { clienteId, solicitudes, postulaciones, chooseProposal } = useDemo();
  const { status, items } = useMarketplace();
  const propuestaDe = postulaciones.find(item => item.id === postulacionId && item.solicitudId === id);
  /** Antes del `return` temprano: los hooks no pueden ir detrás de una condición. */
  const deLaCadena = useProviderRating(propuestaDe?.providerAddress);
  const opiniones = useResenasDeProfesional({
    providerId: propuestaDe?.providerId,
    providerAddress: propuestaDe?.providerAddress,
  });

  const solicitud = solicitudes.find(item => item.id === id && item.clienteId === clienteId);
  const propuesta = propuestaDe;
  if (!solicitud || !propuesta) return <Navigate to="/solicitudes" replace />;

  // Del catálogo salen calificación y trabajos; del perfil creado en la app, sus datos.
  const ficha = items.find(item => item.id === propuesta.providerId);
  const resumen = ficha?.rating ?? deLaCadena;
  const perfil = propuesta.providerPerfil;
  const service = serviceOf(solicitud.servicio);
  const conResenas = Boolean(resumen && resumen.rating_count > 0);
  const esElegida = propuesta.id === solicitud.postulacionElegidaId;
  const hayOtroElegido = solicitud.estado === 'profesional_elegido' && !esElegida;

  const elegir = async () => {
    await chooseProposal(solicitud.id, propuesta.id);
    navigate(`/solicitudes/${solicitud.id}`, { replace: true });
  };

  return <Screen
    header={<ScreenHeader title={propuesta.providerNombre} subtitle="Su propuesta para tu solicitud" />}
    footer={<ScreenFooter className="border-t border-masi-gray bg-white">
      {esElegida
        ? <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-masi-success">
          <CheckCircle2 size={17} aria-hidden="true" />Elegiste a este profesional
        </p>
        : <Button disabled={hayOtroElegido} onClick={elegir}>Elegir a {propuesta.providerNombre}</Button>}
    </ScreenFooter>}
  >
    <div className="px-4 py-6">
      <section className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <div className="flex items-start gap-3">
          <AvatarProfesional providerId={propuesta.providerId} nombre={propuesta.providerNombre} tint={service.tint} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-masi-navy">{propuesta.providerNombre}</h2>
            {ficha && <p className="mt-0.5 truncate text-sm text-masi-blue">{ficha.profession}</p>}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-masi-muted">
              {conResenas && <Star size={14} aria-hidden="true" className="text-masi-navy" />}
              {status === 'ready' && (conResenas && resumen ? formatRating(resumen) : 'Nuevo en Masi')}
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 border-t border-masi-gray pt-3">
          {ficha
            ? <>
              <Dato icon={MapPin}>{ficha.district}</Dato>
              <Dato icon={Briefcase}>{ficha.specialty}</Dato>
              {ficha.rating.completed_jobs > 0 && <Dato icon={BadgeCheck}>
                {ficha.rating.completed_jobs} {ficha.rating.completed_jobs === 1 ? 'trabajo completado' : 'trabajos completados'}
                {ficha.rating.rating_count > 0 && ` · ${ficha.rating.rating_count} ${ficha.rating.rating_count === 1 ? 'valoración' : 'valoraciones'}`}
              </Dato>}
            </>
            : <>
              {perfil?.distrito && <Dato icon={MapPin}>{perfil.distrito}</Dato>}
              {perfil && perfil.servicios.length > 0 && <Dato icon={Briefcase}>{perfil.servicios.join(' · ')}</Dato>}
              {perfil && perfil.aniosExperiencia > 0 && <Dato icon={BadgeCheck}>
                {perfil.aniosExperiencia} {perfil.aniosExperiencia === 1 ? 'año' : 'años'} de experiencia
              </Dato>}
              {resumen && resumen.completed_jobs > 0 && <Dato icon={CheckCircle2}>
                {resumen.completed_jobs} {resumen.completed_jobs === 1 ? 'trabajo completado' : 'trabajos completados'}
                {resumen.rating_count > 0 && ` · ${resumen.rating_count} ${resumen.rating_count === 1 ? 'valoración' : 'valoraciones'}`}
              </Dato>}
            </>}
        </dl>

        {(ficha?.description || perfil?.bio) && <p className="mt-3 border-t border-masi-gray pt-3 text-sm leading-relaxed text-masi-text">
          {ficha?.description || perfil?.bio}
        </p>}
      </section>

      {/*
        * El texto de las reseñas acompaña a la nota de arriba; la nota sigue saliendo del
        * contrato. La sección aparece aunque no haya ninguna opinión —«todavía no tiene»
        * es una respuesta, y su ausencia parecía una pantalla a medio hacer—, pero solo
        * cuando se sabe: mientras carga o si la consulta falla no se afirma nada.
        */}
      {!opiniones.cargando && !opiniones.error && <section className="mt-6" aria-labelledby="opiniones">
        <h3 id="opiniones" className="text-lg font-bold text-masi-navy">Lo que dicen sus clientes</h3>
        {opiniones.resenas.length === 0
          ? <p className="mt-2 text-sm text-masi-muted">Todavía no tiene opiniones.</p>
          : <ul className="mt-3 grid gap-3">
            {opiniones.resenas.map(resena => <li
              key={resena.jobId}
              className="rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm"
            >
              <p className="flex items-center gap-1" aria-label={`${resena.estrellas} de 5 estrellas`}>
                {[1, 2, 3, 4, 5].map(n => <Star
                  key={n}
                  size={14}
                  aria-hidden="true"
                  className={n <= resena.estrellas ? 'fill-masi-orange text-masi-orange' : 'text-masi-gray'}
                />)}
              </p>
              <p className="mt-2 text-sm leading-relaxed break-words text-masi-text">{resena.texto}</p>
            </li>)}
          </ul>}
      </section>}

      <section className="mt-6 rounded-masi-card border border-masi-gray bg-white p-4 shadow-masi-sm">
        <h3 className="text-sm font-semibold text-masi-navy">Su propuesta</h3>
        <p className="mt-3 flex items-baseline justify-between gap-3">
          <span className="text-sm text-masi-muted">Precio referencial</span>
          <strong className="text-2xl font-bold text-masi-navy">{formatPrice(propuesta.precio)}</strong>
        </p>
        <p className="mt-3 flex items-center gap-1.5 border-t border-masi-gray pt-3 text-sm text-masi-muted">
          <Clock3 size={14} aria-hidden="true" />Llega en {propuesta.minutos} min
        </p>
      </section>
    </div>
  </Screen>;
}
