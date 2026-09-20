import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BadgeCheck, Check, ChevronDown, CircleAlert, Clock3, Droplets, Ellipsis, Hammer, House, Info, KeyRound, MapPin, PaintRoller, Plug, Search, ShieldCheck, SlidersHorizontal, Snowflake, Sparkles, Star, Wrench, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RatingSource } from '../../shared/escrow';
import { DISTRICTS, TRADES, averageRating, formatPrice, formatRating, loadMarketplace, selectProviders } from './marketplace';
import type { Filters, ProviderWithRating, SortOrder, Trade } from './marketplace';

const tradeIcons: Record<Trade, LucideIcon> = { Electricidad: Zap, Gasfitería: Droplets, Cerrajería: KeyRound, Carpintería: Hammer, Pintura: PaintRoller, Instalaciones: Plug, Reparaciones: Wrench, Limpieza: Sparkles, 'Aire Acondicionado': Snowflake, 'Más servicios': Ellipsis };
const emptyFilters: Filters = { trade: '', district: '' };
type LoadState = { status: 'loading' | 'error'; items: ProviderWithRating[] } | { status: 'ready'; items: ProviderWithRating[] };

function Logo() {
  return <a className="brand" href="#inicio" aria-label="Masi, inicio">
    <svg className="brand-mark" viewBox="0 0 52 48" aria-hidden="true"><path d="M5 41V20L15 10l11 11 11-11 10 10v21" /><path className="brand-window" d="M21 29h4v4h-4zm6 0h4v4h-4zm-6 6h4v4h-4zm6 0h4v4h-4z" /></svg>
    <span className="brand-name">Mas<span className="brand-i">ı<span /></span><small>TU HOGAR EN BUENAS MANOS</small></span>
  </a>;
}

function Portrait({ provider, className = '' }: { provider: ProviderWithRating; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={`portrait portrait-fallback ${className}`} aria-label={`Foto genérica no disponible de ${provider.name}`}>{provider.name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span> : <img className={`portrait ${className}`} src={provider.photo} alt={`Foto genérica del perfil de prueba de ${provider.name}`} width="80" height="80" loading="lazy" onError={() => setFailed(true)} />;
}

function Rating({ provider }: { provider: ProviderWithRating }) {
  const hasRating = averageRating(provider.rating) !== null;
  return <div className="rating"><Star size={17} aria-hidden="true" /><strong>{formatRating(provider.rating)}</strong>{hasRating && <span>({provider.rating.rating_count} reseñas)</span>}</div>;
}

function ProviderCard({ provider, onDetails }: { provider: ProviderWithRating; onDetails: (provider: ProviderWithRating) => void }) {
  const Icon = tradeIcons[provider.trade];
  return <article className="provider-card" aria-label={provider.name}>
    <div className="provider-card-top"><Portrait provider={provider} /><span className="sample-tag"><Info size={12} aria-hidden="true" /> Perfil de prueba</span></div>
    <div className="provider-heading"><h3>{provider.name}</h3><p>{provider.profession}</p></div>
    <p className="location"><MapPin size={15} aria-hidden="true" />{provider.district}, Lima</p>
    <Rating provider={provider} />
    <p className="completed"><BadgeCheck size={17} aria-hidden="true" />{provider.rating.completed_jobs} trabajos completados</p>
    <div className="specialty"><Icon size={16} aria-hidden="true" /><span>{provider.specialty}</span></div>
    <div className="card-footer"><div><span className="price-label">Precio referencial</span><strong className="price">{formatPrice(provider.reference_price_pen)}</strong></div><button className="details-button" onClick={() => onDetails(provider)} aria-label={`Ver detalles de ${provider.name}`}>Ver detalles<ArrowRight size={17} aria-hidden="true" /></button></div>
  </article>;
}

function ProviderDetails({ provider, onClose }: { provider: ProviderWithRating | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (provider && dialog && !dialog.open) dialog.showModal();
    if (!provider && dialog?.open) dialog.close();
  }, [provider]);
  return <dialog ref={dialogRef} className="provider-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="detail-name" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    {provider && <div className="dialog-content"><button className="icon-button dialog-close" onClick={onClose} aria-label="Cerrar detalles" autoFocus><X size={22} /></button>
      <span className="eyebrow">CONOCE A TU PROFESIONAL</span><Portrait provider={provider} className="dialog-portrait" /><h2 id="detail-name">{provider.name}</h2><p className="dialog-profession">{provider.profession} · {provider.district}</p><Rating provider={provider} />
      <p className="dialog-description">{provider.description}</p><div className="detail-stats"><div><strong>{provider.rating.completed_jobs}</strong><span>Trabajos completados</span></div><div><strong>{provider.rating.disputes}</strong><span>Disputas registradas</span></div></div>
      <div className="detail-price"><span>Precio referencial<strong>{formatPrice(provider.reference_price_pen)}</strong></span><p>El monto final se acuerda según tu trabajo.</p></div>
      <p className="demo-explanation"><Info size={19} aria-hidden="true" /><span>Este perfil, su foto y sus calificaciones son de prueba. Las solicitudes de trabajo aún no están disponibles.</span></p><button className="button primary" onClick={onClose}>Seguir explorando<ArrowRight size={18} aria-hidden="true" /></button>
    </div>}
  </dialog>;
}

export function App({ ratingSource }: { ratingSource: RatingSource }) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<SortOrder>('featured');
  const [state, setState] = useState<LoadState>({ status: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<ProviderWithRating | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let current = true;
    setState({ status: 'loading', items: [] });
    loadMarketplace(ratingSource).then(items => { if (current) setState({ status: 'ready', items }); }).catch(() => { if (current) setState({ status: 'error', items: [] }); });
    return () => { current = false; };
  }, [ratingSource, attempt]);

  const items = selectProviders(state.items, filters, sort);
  const hasFilters = Boolean(filters.trade || filters.district);
  const search = (event: FormEvent) => { event.preventDefault(); resultsRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); };

  return <>
    <a className="skip-link" href="#profesionales">Ir a profesionales</a>
    <header className="site-header" id="inicio"><div className="container header-inner"><Logo /><nav aria-label="Navegación principal"><a className="nav-active" href="#servicios">Explorar servicios</a><a href="#como-funciona">¿Cómo funciona?</a></nav><span className="demo-badge"><span />Demo Masi</span></div></header>
    <main>
      <section className="hero container" aria-labelledby="hero-title"><div className="hero-copy"><span className="eyebrow"><span />PERSONAS QUE SOLUCIONAN TU DÍA</span><h1 id="hero-title">Tu hogar en<br />buenas manos<span className="orange-dot">.</span></h1><p>Encuentra a quien sabe hacerlo.<br className="desktop-break" /> Ayuda para tu hogar, más cerca de ti.</p><div className="hero-promise"><ShieldCheck size={18} aria-hidden="true" /><span>Un trabajo bien hecho empieza con confianza.</span></div></div>
        <div className="hero-visual"><img src="/images/home.jpg" alt="Sala luminosa con muebles de madera y plantas" width="720" height="480" fetchPriority="high" /><div className="home-label"><House size={16} aria-hidden="true" />Un hogar, muchas soluciones</div><div className="hero-note"><span className="hero-note-icon"><ShieldCheck size={27} aria-hidden="true" /></span><div><strong>Tu tranquilidad, primero</strong><span>Conoce a quien cuida tu hogar.</span></div></div></div>
      </section>

      <section id="servicios" className="search-section container" aria-labelledby="search-title"><div className="search-panel"><div className="search-panel-title"><Search size={21} aria-hidden="true" /><h2 id="search-title">¿Qué necesitas resolver hoy?</h2></div><form className="search-form" onSubmit={search}><label className="select-field"><Wrench size={21} aria-hidden="true" /><span><span className="field-label">Servicio</span><select aria-label="Oficio" value={filters.trade} onChange={event => setFilters({ ...filters, trade: event.target.value })}><option value="">Todos los oficios</option>{TRADES.map(trade => <option key={trade}>{trade}</option>)}</select></span><ChevronDown size={16} aria-hidden="true" /></label><label className="select-field"><MapPin size={21} aria-hidden="true" /><span><span className="field-label">Distrito</span><select aria-label="Distrito" value={filters.district} onChange={event => setFilters({ ...filters, district: event.target.value })}><option value="">Todos los distritos</option>{DISTRICTS.map(district => <option key={district}>{district}</option>)}</select></span><ChevronDown size={16} aria-hidden="true" /></label><button className="button primary search-button" type="submit"><Search size={19} aria-hidden="true" />Buscar ayuda</button></form></div>
        <div className="category-grid" role="group" aria-label="Filtrar por oficio">{TRADES.map((trade, index) => { const Icon = tradeIcons[trade]; return <button key={trade} className={`category ${filters.trade === trade ? 'category-active' : ''}`} aria-pressed={filters.trade === trade} onClick={() => setFilters({ ...filters, trade: filters.trade === trade ? '' : trade })}><span className={`category-icon tint-${index % 3}`}><Icon size={27} aria-hidden="true" />{filters.trade === trade && <span className="category-check"><Check size={12} aria-hidden="true" /></span>}</span><span>{trade}</span></button>; })}</div>
      </section>

      <section className="results-section container" id="profesionales" ref={resultsRef} aria-labelledby="results-title"><div className="results-heading"><div><span className="eyebrow">ENCUENTRA TU PRÓXIMA MANO AMIGA</span><h2 id="results-title">Profesionales para tu hogar</h2><p className="result-count" role="status" aria-live="polite">{state.status === 'loading' ? 'Buscando profesionales…' : state.status === 'error' ? 'No pudimos cargar los profesionales.' : `${items.length} ${items.length === 1 ? 'profesional' : 'profesionales'}${filters.district ? ` en ${filters.district}` : ' en Lima'}${filters.trade ? ` · ${filters.trade}` : ' para explorar'}`}</p></div><label className="sort-field"><SlidersHorizontal size={17} aria-hidden="true" /><span className="sr-only">Ordenar profesionales</span><select aria-label="Ordenar profesionales" value={sort} onChange={event => setSort(event.target.value as SortOrder)}><option value="featured">Orden del catálogo</option><option value="rating">Mejor calificación</option><option value="price">Menor precio</option></select><ChevronDown size={15} aria-hidden="true" /></label></div>
        <div className="demo-notice"><Info size={18} aria-hidden="true" /><p>Estás explorando una demo. Los perfiles, fotos y calificaciones son de prueba.</p></div>
        {hasFilters && <div className="active-filters">{filters.trade && <button onClick={() => setFilters({ ...filters, trade: '' })} aria-label={`Quitar filtro ${filters.trade}`}>{filters.trade}<X size={14} aria-hidden="true" /></button>}{filters.district && <button onClick={() => setFilters({ ...filters, district: '' })} aria-label={`Quitar filtro ${filters.district}`}>{filters.district}<X size={14} aria-hidden="true" /></button>}<button className="clear-filters" onClick={() => setFilters(emptyFilters)}>Limpiar filtros</button></div>}
        {state.status === 'loading' && <div className="provider-grid" aria-label="Cargando profesionales" aria-busy="true">{[0, 1, 2].map(key => <div key={key} className="provider-card skeleton-card" aria-hidden="true"><div className="skeleton skeleton-avatar" /><div className="skeleton skeleton-title" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton skeleton-footer" /></div>)}</div>}
        {state.status === 'error' && <div className="empty-state" role="alert"><CircleAlert size={38} aria-hidden="true" /><h3>No pudimos cargar los profesionales</h3><p>Algo salió mal. Inténtalo de nuevo.</p><button className="button primary" onClick={() => setAttempt(value => value + 1)}>Volver a intentar<ArrowRight size={18} aria-hidden="true" /></button></div>}
        {state.status === 'ready' && (items.length ? <div className="provider-grid">{items.map(provider => <ProviderCard key={provider.id} provider={provider} onDetails={setSelected} />)}</div> : <div className="empty-state"><Search size={38} aria-hidden="true" /><h3>Seguimos buscando buenas manos</h3><p>No hay profesionales de prueba con estos filtros.<br />Prueba con otro oficio o distrito.</p><button className="button primary" onClick={() => setFilters(emptyFilters)}>Ver todos los profesionales<ArrowRight size={18} aria-hidden="true" /></button></div>)}
      </section>

      <section className="how-section container" id="como-funciona" aria-labelledby="how-title"><div className="how-intro"><span className="eyebrow">ASÍ DE SIMPLE</span><h2 id="how-title">Menos pendientes.<br />Más tranquilidad.</h2><p>Encuentra la ayuda que tu hogar necesita, a tu ritmo.</p></div><ol className="how-steps"><li><span className="step-number">01</span><Search aria-hidden="true" /><h3>Encuentra tu servicio</h3><p>Elige el oficio y busca en tu distrito.</p></li><li><span className="step-number">02</span><Star aria-hidden="true" /><h3>Conoce al profesional</h3><p>Revisa sus calificaciones y trabajos completados.</p></li><li><span className="step-number">03</span><House aria-hidden="true" /><h3>Elige con tranquilidad</h3><p>Compara opciones para tu próximo arreglo.</p></li></ol></section>
      <section className="trust-banner container" aria-label="Masi, siempre contigo en casa"><div><ShieldCheck size={32} aria-hidden="true" /><h2>Tu hogar merece buenas manos.</h2></div><p><span><ShieldCheck size={18} aria-hidden="true" />Confianza</span><span><Clock3 size={18} aria-hidden="true" />Simplicidad</span><span><MapPin size={18} aria-hidden="true" />Cerca de ti</span></p></section>
    </main>
    <footer className="site-footer container"><Logo /><p>Hecho con cariño para los hogares de Lima.</p><span>Demo · Septiembre 2026</span></footer>
    <ProviderDetails provider={selected} onClose={() => setSelected(null)} />
  </>;
}
