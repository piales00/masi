import { useEffect, useRef, useState } from 'react';
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
import { useDemo } from '../demo/DemoContext';
import { TRADES } from '../marketplace';
import type { Trade } from '../marketplace';
import { serviceOf } from '../trades';
import type { Service } from '../trades';

const MAX_CHARS = 300;
const MAX_PHOTOS = 5;
const TIMINGS = ['Lo antes posible', 'Hoy', 'Elegir fecha'] as const;

/**
 * Simulación local de clasificación: compara palabras clave contra el texto escrito.
 * No hay IA ni servicio detrás. Cuando exista clasificación real, se reemplaza
 * únicamente esta tabla y suggestService; la interfaz no cambia.
 */
const SERVICE_KEYWORDS: readonly { id: Trade; words: readonly string[] }[] = [
  { id: 'Cerrajería', words: ['chapa', 'cerradura', 'llave'] },
  { id: 'Electricidad', words: ['luz', 'electric', 'enchufe'] },
  { id: 'Gasfitería', words: ['tuberia', 'fuga', 'cano', 'grifo'] },
  { id: 'Pintura', words: ['pintar', 'pintura', 'pintor'] },
  { id: 'Carpintería', words: ['mueble', 'madera', 'closet'] },
  { id: 'Instalaciones', words: ['instalar', 'repisa', 'colgar'] },
  { id: 'Limpieza', words: ['limpiar', 'limpieza', 'sucio'] },
  { id: 'Reparaciones', words: ['reparar', 'arreglar', 'roto'] },
];

const normalize = (text: string): string => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function suggestService(description: string): Service | null {
  const text = normalize(description);
  if (text.trim().length < 3) return null;
  let best: { id: Trade; hits: number } | null = null;
  for (const { id, words } of SERVICE_KEYWORDS) {
    const hits = words.filter(word => text.includes(word)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { id, hits };
  }
  return best ? serviceOf(best.id) : null;
}

interface Photo { id: string; url: string; name: string }

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

  // Las vistas previas son URLs de objeto: hay que liberarlas al salir de la pantalla.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => { photosRef.current.forEach(photo => URL.revokeObjectURL(photo.url)); }, []);

  const suggestion = !trade && !picking ? suggestService(description) : null;
  const showPicker = picking || (!trade && !suggestion);
  const chosen = trade ? serviceOf(trade) : null;
  const today = new Date().toLocaleDateString('en-CA');

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = [...(event.target.files ?? [])].filter(file => file.type.startsWith('image/'));
    setPhotos(current => [
      ...current,
      ...chosen.slice(0, MAX_PHOTOS - current.length).map(file => ({ id: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name })),
    ]);
    event.target.value = '';
  };

  const removePhoto = (id: string) => setPhotos(current => {
    const gone = current.find(photo => photo.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    return current.filter(photo => photo.id !== id);
  });

  const ready = Boolean(trade && description.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!trade || !description.trim()) return;
    publishRequest({
      servicio: trade,
      descripcion: description.trim(),
      fotos: photos.length,
      ubicacion: locationMode === 'actual' ? 'Ubicación actual' : address.trim(),
      distrito: district.trim(),
      cliente: [profile?.firstName, profile?.lastName].filter(Boolean).join(' '),
    });
    navigate(`/profesionales?servicio=${encodeURIComponent(trade)}`);
  };

  return <Screen
    header={<ScreenHeader title="Nueva solicitud" subtitle="Cuéntanos qué está pasando" />}
    footer={<ScreenFooter className="border-t border-masi-gray bg-white">
      <Button type="submit" form="solicitud" disabled={!ready}>
        Publicar solicitud<ArrowRight size={18} aria-hidden="true" />
      </Button>
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
        <p className="mt-1 text-xs text-masi-muted">Ayudan al profesional a entender el problema. Máximo {MAX_PHOTOS}.</p>

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

        {photos.length < MAX_PHOTOS && <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-masi-input border border-dashed border-masi-gray bg-white px-4 text-sm font-semibold text-masi-blue transition-colors duration-200 ease-out hover:border-masi-blue">
          <Camera size={18} aria-hidden="true" />
          {photos.length === 0 ? 'Agregar fotos' : `Agregar otra (${photos.length}/${MAX_PHOTOS})`}
          <input type="file" accept="image/*" multiple onChange={addPhotos} className="sr-only" />
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
