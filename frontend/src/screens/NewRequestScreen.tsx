import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowRight, Camera, MapPin, X } from 'lucide-react';
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

const MAX_CHARS = 300;
const MAX_PHOTOS = 5;
const URGENCIES = ['Lo antes posible', 'Hoy', 'Puedo esperar'] as const;
const BUDGETS = ['Hasta S/ 50', 'S/ 50 a S/ 100', 'S/ 100 a S/ 200', 'Más de S/ 200', 'No estoy seguro'] as const;

interface Photo { id: string; url: string; name: string }

function Options({ legend, options, value, onChange, hint }: {
  legend: string;
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  return <fieldset className="border-0 p-0">
    <legend className="text-sm font-semibold text-masi-navy">{legend}</legend>
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map(option => <button
        key={option}
        type="button"
        onClick={() => onChange(value === option ? '' : option)}
        aria-pressed={value === option}
        className={cn(
          'min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ease-out',
          value === option ? 'border-masi-blue bg-masi-blue text-white' : 'border-masi-gray bg-white text-masi-navy hover:border-masi-blue',
        )}
      >{option}</button>)}
    </div>
    {hint && <p className="mt-2 text-xs leading-relaxed text-masi-muted">{hint}</p>}
  </fieldset>;
}

export function NewRequestScreen() {
  const navigate = useNavigate();
  const { profile } = useDemo();
  const incoming = useLocation().state as { description?: string; trade?: Trade } | null;

  const [trade, setTrade] = useState<Trade | ''>(incoming?.trade && TRADES.includes(incoming.trade) ? incoming.trade : '');
  const [description, setDescription] = useState(incoming?.description ?? '');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [editingDistrict, setEditingDistrict] = useState(false);
  const [urgency, setUrgency] = useState<string>(URGENCIES[0]);
  const [budget, setBudget] = useState('');

  // Las vistas previas son URLs de objeto: hay que liberarlas al salir de la pantalla.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => { photosRef.current.forEach(photo => URL.revokeObjectURL(photo.url)); }, []);

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
    if (!ready) return;
    navigate(`/profesionales?servicio=${encodeURIComponent(trade)}`);
  };

  return <Screen
    header={<ScreenHeader title="Nueva solicitud" subtitle="Cuéntanos qué está pasando" />}
    footer={<ScreenFooter className="border-t border-masi-gray bg-white">
      <Button type="submit" form="solicitud" disabled={!ready}>
        Buscar profesionales<ArrowRight size={18} aria-hidden="true" />
      </Button>
    </ScreenFooter>}
  >
    <form id="solicitud" onSubmit={submit} className="space-y-8 px-4 py-6">
      <section>
        <h2 className="text-sm font-semibold text-masi-navy">¿Qué servicio necesitas?</h2>
        <div className="mt-3">
          <TradeChips selected={trade} onSelect={next => setTrade(next === trade ? '' : next)} label="Elegir servicio" />
        </div>
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

      <Options legend="¿Qué tan urgente es?" options={URGENCIES} value={urgency} onChange={setUrgency} />

      <Options
        legend="¿Tienes un presupuesto aproximado? (opcional)"
        options={BUDGETS}
        value={budget}
        onChange={setBudget}
        hint="Esto es solo una referencia para los profesionales. El precio real se define después de revisar el problema."
      />
    </form>
  </Screen>;
}
