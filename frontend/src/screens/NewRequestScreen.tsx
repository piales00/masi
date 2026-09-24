import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowRight, Camera, LocateFixed, MapPin, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { fieldBox } from '../components/Field';
import { Screen } from '../components/Screen';
import { ScreenFooter } from '../components/ScreenFooter';
import { ScreenHeader } from '../components/ScreenHeader';
import { TradeChips } from '../components/TradeChips';
import { cn } from '../cn';
import { MAX_BYTES_FOTOS, MAX_FOTOS } from '../config';
import { useDemo } from '../demo/DemoContext';
import { toStoredImage } from '../images';
import { TRADES } from '../marketplace';
import type { Trade } from '../marketplace';
import { sugerirServicio } from '../sugerenciaDeServicio';
import { serviceOf } from '../trades';

const MAX_CHARS = 300;
const TIMINGS = ['Lo antes posible', 'Hoy', 'Elegir fecha'] as const;

/** `url` ya es el data URL definitivo: la vista previa y lo que se manda son lo mismo. */
interface Photo { id: string; url: string; name: string }

/** Ni la foto se pudo comprimir lo suficiente, o no queda sitio en el conjunto. */
type Intento = { foto: Photo } | { fallo: string };

const SIN_SITIO = 'Juntas, las fotos pesan demasiado. Quita alguna para agregar esta.';

function Options({ legend, options, value, onChange }: {
  legend: string;
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return <fieldset className="border-0 p-0">
    <legend className="text-sm font-semibold text-masi-navy">{legend}</legend>
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map(option => <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        aria-pressed={value === option}
        className={cn(
          'min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ease-out',
          value === option ? 'border-masi-blue bg-masi-blue text-white' : 'border-masi-gray bg-white text-masi-navy hover:border-masi-blue',
        )}
      >{option}</button>)}
    </div>
  </fieldset>;
}

export function NewRequestScreen() {
  const navigate = useNavigate();
  const { profile, publishRequest } = useDemo();
  const incoming = useLocation().state as { description?: string; trade?: Trade } | null;

  const [trade, setTrade] = useState<Trade | ''>(incoming?.trade && TRADES.includes(incoming.trade) ? incoming.trade : '');
  const [description, setDescription] = useState(incoming?.description ?? '');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [editingDistrict, setEditingDistrict] = useState(false);
  const [locationMode, setLocationMode] = useState<'actual' | 'direccion'>('actual');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [timing, setTiming] = useState<string>(TIMINGS[0]);
  const [date, setDate] = useState('');
  /** Solo se abre la grilla completa cuando el usuario pide cambiar de servicio. */
  const [picking, setPicking] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState('');
  /** Lo que salió mal al agregar fotos; se muestra junto a la rejilla, no al publicar. */
  const [avisoFotos, setAvisoFotos] = useState('');
  /** Combinación oficio→sugerencia que la persona ya decidió mantener. */
  const [sugerenciaDescartada, setSugerenciaDescartada] = useState('');

  /*
   * La descripción se evalúa siempre, haya oficio elegido o no. Antes solo se miraba
   * cuando el campo estaba vacío, así que quien entraba desde una categoría —el caso
   * normal— nunca veía una sugerencia aunque describiera otra cosa.
   */
  const sugerido = sugerirServicio(description);
  const suggestion = !trade && !picking && sugerido ? serviceOf(sugerido) : null;
  const showPicker = picking || (!trade && !suggestion);
  const chosen = trade ? serviceOf(trade) : null;
  /** Con oficio elegido, la sugerencia solo aparece si apunta a otro y no se descartó. */
  const claveSugerencia = `${trade}→${sugerido}`;
  const otroServicio = trade && sugerido && sugerido !== trade && sugerenciaDescartada !== claveSugerencia
    ? serviceOf(sugerido)
    : null;
  const today = new Date().toLocaleDateString('en-CA');

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const elegidas = [...(event.target.files ?? [])].filter(file => file.type.startsWith('image/'));
    event.target.value = '';
    setAvisoFotos('');
    const hueco = MAX_FOTOS - photos.length;
    const intentos = await Promise.all(elegidas.slice(0, hueco).map(async (file): Promise<Intento> => {
      try {
        return { foto: { id: crypto.randomUUID(), url: await toStoredImage(file), name: file.name } };
      } catch (cause) {
        // El motivo se le cuenta a la persona: de otro modo la foto desaparecía sin explicación.
        return { fallo: cause instanceof Error ? cause.message : 'No pudimos usar esa foto.' };
      }
    }));

    // El servidor mide también el conjunto, así que aquí no se acepta lo que él rechazaría.
    let peso = photos.reduce((total, photo) => total + photo.url.length, 0);
    const validas: Photo[] = [];
    let aviso = '';
    for (const intento of intentos) {
      if ('fallo' in intento) aviso ||= intento.fallo;
      else if (peso + intento.foto.url.length > MAX_BYTES_FOTOS) aviso ||= SIN_SITIO;
      else {
        peso += intento.foto.url.length;
        validas.push(intento.foto);
      }
    }
    if (validas.length > 0) setPhotos(current => [...current, ...validas].slice(0, MAX_FOTOS));
    if (aviso) setAvisoFotos(aviso);
  };

  const removePhoto = (id: string) => {
    setPhotos(current => current.filter(photo => photo.id !== id));
    setAvisoFotos('');
  };

  const ready = Boolean(trade && description.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trade || !description.trim() || publicando) return;
    setPublicando(true);
    setError('');
    try {
      const solicitud = await publishRequest({
        servicio: trade,
        descripcion: description.trim(),
        fotos: photos.map(photo => photo.url),
        ubicacion: locationMode === 'actual' ? 'Ubicación actual' : address.trim(),
        distrito: district.trim(),
        cuando: timing === 'Elegir fecha' && date ? `El ${date}` : timing,
        cliente: [profile?.firstName, profile?.lastName].filter(Boolean).join(' '),
      });
      navigate(`/solicitudes/${solicitud.id}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Algo salió mal. Inténtalo de nuevo.');
    } finally {
      setPublicando(false);
    }
  };

  return <Screen
    header={<ScreenHeader title="Nueva solicitud" subtitle="Cuéntanos qué está pasando" />}
    footer={<ScreenFooter className="border-t border-masi-gray bg-white">
      <Button type="submit" form="solicitud" disabled={!ready || publicando}>
        {publicando ? 'Publicando…' : 'Publicar solicitud'}<ArrowRight size={18} aria-hidden="true" />
      </Button>
      {error && <p role="alert" className="mt-2 text-center text-sm text-masi-error">{error}</p>}
      <p className="mt-2 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-masi-muted">
        <ShieldCheck size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>Los acuerdos realizados fuera de la app no están cubiertos por la garantía de Masi.</span>
      </p>
    </ScreenFooter>}
  >
    <form id="solicitud" onSubmit={submit} className="space-y-8 px-4 py-6">
      <section>
        <h2 className="text-sm font-semibold text-masi-navy">¿Qué servicio necesitas?</h2>

        {showPicker && <div className="mt-3">
          <TradeChips selected={trade} onSelect={next => { setTrade(next); setPicking(false); }} label="Elegir servicio" />
        </div>}

        {!showPicker && chosen && <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="flex min-h-10 items-center gap-2 rounded-full border border-masi-blue bg-masi-blue px-4 text-sm font-semibold text-white">
            <span className="grid size-6 place-items-center rounded-full bg-white/20">
              <chosen.icon size={14} aria-hidden="true" />
            </span>
            {chosen.name}
          </span>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="text-sm font-semibold text-masi-blue underline-offset-4 hover:underline"
          >Cambiar servicio</button>
        </div>}

        {otroServicio && chosen && <div className="mt-3 rounded-masi-card border border-masi-blue bg-masi-blue-50 p-4">
          <p className="text-sm font-bold text-masi-navy">¿Quizás necesitas {otroServicio.name}?</p>
          <p className="mt-1 text-sm leading-relaxed text-masi-navy">
            Por lo que describes, tu solicitud parece estar más relacionada con un servicio de {otroServicio.name}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="!w-auto" onClick={() => setTrade(otroServicio.id)}>Cambiar a {otroServicio.name}</Button>
            <Button
              variant="secondary"
              className="!w-auto"
              onClick={() => setSugerenciaDescartada(claveSugerencia)}
            >Mantener {chosen.name}</Button>
          </div>
        </div>}

        {!showPicker && !chosen && suggestion && <div className="mt-3 rounded-masi-card border border-masi-blue bg-masi-blue-50 p-4">
          <p className="flex items-start gap-2 text-sm text-masi-navy">
            <Sparkles size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-masi-blue" />
            <span>Parece que necesitas <strong className="font-bold">{suggestion.name}</strong>. Confírmalo o elige otro servicio.</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="!w-auto" onClick={() => setTrade(suggestion.id)}>Confirmar</Button>
            <Button variant="secondary" className="!w-auto" onClick={() => setPicking(true)}>Cambiar servicio</Button>
          </div>
        </div>}
      </section>

      <section>
        <label className="block">
          <span className="text-sm font-semibold text-masi-navy">¿Qué necesitas resolver?</span>
          <textarea
            value={description}
            onChange={event => setDescription(event.target.value.slice(0, MAX_CHARS))}
            maxLength={MAX_CHARS}
            rows={4}
            placeholder="Ej. La chapa de la puerta principal no gira y quedé sin poder cerrar bien."
            className={cn(fieldBox, 'mt-3 resize-none py-3')}
          />
        </label>
        <p className="mt-1.5 text-right text-xs text-masi-muted">{description.length}/{MAX_CHARS}</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-masi-navy">Agregar fotos <span className="font-normal text-masi-muted">(opcional)</span></h2>
        <p className="mt-1 text-xs text-masi-muted">Ayudan al profesional a entender el problema. Máximo {MAX_FOTOS}.</p>
        {avisoFotos && <p role="alert" className="mt-2 text-sm text-masi-error">{avisoFotos}</p>}

        {photos.length > 0 && <ul className="mt-3 grid grid-cols-3 gap-2">
          {photos.map(photo => <li key={photo.id} className="relative">
            <img src={photo.url} alt={photo.name} className="aspect-square w-full rounded-masi-input border border-masi-gray object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(photo.id)}
              aria-label={`Quitar ${photo.name}`}
              className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border border-masi-gray bg-white text-masi-navy shadow-masi-sm"
            ><X size={14} aria-hidden="true" /></button>
          </li>)}
        </ul>}

        {photos.length < MAX_FOTOS && <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-masi-input border border-dashed border-masi-gray bg-white px-4 text-sm font-semibold text-masi-blue transition-colors duration-200 ease-out hover:border-masi-blue">
          <Camera size={18} aria-hidden="true" />
          {photos.length === 0 ? 'Agregar fotos' : `Agregar otra (${photos.length}/${MAX_FOTOS})`}
          <input type="file" accept="image/*" multiple onChange={event => { void addPhotos(event); }} className="sr-only" />
        </label>}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-masi-navy">Ubicación</h2>
        {editingDistrict
          ? <input
            value={district}
            onChange={event => setDistrict(event.target.value)}
            onBlur={() => setEditingDistrict(false)}
            autoFocus
            placeholder="Ej. Chorrillos, Lima"
            className={cn(fieldBox, 'mt-3 h-12')}
          />
          : <div className="mt-3 flex items-center gap-3 rounded-masi-input border border-masi-gray bg-white px-4 py-3">
            <MapPin size={17} aria-hidden="true" className="shrink-0 text-masi-blue" />
            <span className="min-w-0 flex-1 truncate text-base text-masi-text">{district || 'Sin distrito'}</span>
            <button type="button" onClick={() => setEditingDistrict(true)} className="shrink-0 text-sm font-semibold text-masi-blue underline-offset-4 hover:underline">Cambiar</button>
          </div>}
      </section>

      {/* Ambas opciones son simuladas: la geolocalización y el mapa reales quedan pendientes. */}
      <section>
        <h2 className="text-sm font-semibold text-masi-navy">Ubicación específica</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Cómo indicar la ubicación">
          {([['actual', 'Usar mi ubicación actual', LocateFixed], ['direccion', 'Buscar dirección', Search]] as const).map(([id, label, Icon]) => <button
            key={id}
            type="button"
            onClick={() => setLocationMode(id)}
            aria-pressed={locationMode === id}
            className={cn(
              'flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ease-out',
              locationMode === id ? 'border-masi-blue bg-masi-blue text-white' : 'border-masi-gray bg-white text-masi-navy hover:border-masi-blue',
            )}
          ><Icon size={15} aria-hidden="true" />{label}</button>)}
        </div>

        {locationMode === 'actual'
          ? <p className="mt-3 flex items-start gap-2 rounded-masi-input bg-masi-blue-50 p-3 text-xs leading-relaxed text-masi-navy">
            <LocateFixed size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>Compartiremos tu ubicación con el profesional cuando publiques la solicitud.</span>
          </p>
          : <input
            value={address}
            onChange={event => setAddress(event.target.value)}
            placeholder="Ej. Av. Defensores del Morro 1234"
            aria-label="Dirección"
            className={cn(fieldBox, 'mt-3 h-12')}
          />}

        <label className="mt-3 block">
          <span className="text-sm font-semibold text-masi-navy">Referencia <span className="font-normal text-masi-muted">(opcional)</span></span>
          <input
            value={reference}
            onChange={event => setReference(event.target.value)}
            placeholder="Ej. Portón negro, frente al parque"
            className={cn(fieldBox, 'mt-2 h-12')}
          />
        </label>
      </section>

      <section>
        <Options legend="¿Cuándo necesitas el servicio?" options={TIMINGS} value={timing} onChange={setTiming} />
        {timing === 'Elegir fecha' && <label className="mt-3 block">
          <span className="sr-only">Fecha del servicio</span>
          <input
            type="date"
            value={date}
            min={today}
            onChange={event => setDate(event.target.value)}
            className={cn(fieldBox, 'h-12')}
          />
        </label>}
      </section>
    </form>
  </Screen>;
}
