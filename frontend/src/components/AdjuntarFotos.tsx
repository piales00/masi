import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MAX_FOTOS } from '../../../shared/api';
import { toStoredImage } from '../images';

/**
 * Adjuntar imágenes como prueba. Reescala antes de guardarlas, así que una foto recién
 * hecha con el móvil entra sin que el servidor la rechace por tamaño.
 */
export function AdjuntarFotos({ fotos, onChange, disabled }: {
  fotos: string[];
  onChange: (siguientes: string[]) => void;
  disabled?: boolean;
}) {
  const [aviso, setAviso] = useState('');

  const agregar = async (evento: ChangeEvent<HTMLInputElement>) => {
    const elegidas = [...(evento.target.files ?? [])].filter(file => file.type.startsWith('image/'));
    evento.target.value = '';
    setAviso('');
    const hueco = MAX_FOTOS - fotos.length;
    const procesadas = await Promise.all(elegidas.slice(0, hueco).map(async file => {
      try {
        return await toStoredImage(file);
      } catch {
        return null;
      }
    }));
    const validas = procesadas.filter((foto): foto is string => foto !== null);
    if (validas.length < elegidas.slice(0, hueco).length) {
      setAviso('Alguna foto no se pudo usar. Prueba con otra.');
    }
    if (validas.length > 0) onChange([...fotos, ...validas].slice(0, MAX_FOTOS));
  };

  return <div>
    {fotos.length > 0 && <ul className="mb-3 flex flex-wrap gap-2">
      {fotos.map((foto, indice) => <li key={indice} className="relative">
        <img src={foto} alt={`Prueba ${indice + 1}`} className="size-20 rounded-masi-input border border-masi-gray object-cover" />
        <button
          type="button"
          onClick={() => onChange(fotos.filter((_, i) => i !== indice))}
          disabled={disabled}
          aria-label={`Quitar la foto ${indice + 1}`}
          className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-masi-navy text-white"
        ><X size={13} aria-hidden="true" /></button>
      </li>)}
    </ul>}

    {fotos.length < MAX_FOTOS && <label className={disabled
      ? 'flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-masi-input border border-dashed border-masi-gray text-sm font-semibold text-masi-muted'
      : 'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-masi-input border border-dashed border-masi-blue text-sm font-semibold text-masi-blue'}
    >
      <ImagePlus size={17} aria-hidden="true" />
      {fotos.length === 0 ? 'Adjuntar fotos' : `Adjuntar otra (${fotos.length}/${MAX_FOTOS})`}
      <input type="file" accept="image/*" multiple disabled={disabled} onChange={event => { void agregar(event); }} className="sr-only" />
    </label>}

    {aviso && <p className="mt-2 text-xs text-masi-error">{aviso}</p>}
  </div>;
}
