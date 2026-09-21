import { Droplets, Ellipsis, Hammer, KeyRound, PaintRoller, Plug, Sparkles, Wrench, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Trade } from './marketplace';

/** Tintes suaves de la §3.4 del STYLE_GUIDE. El texto va en navy o azul, nunca en naranja. */
export type TradeTint = 'orange' | 'blue' | 'green';

export const TINT_CLASSES: Record<TradeTint, string> = {
  orange: 'bg-masi-orange-50 text-masi-navy',
  blue: 'bg-masi-blue-50 text-masi-blue',
  green: 'bg-masi-green-50 text-masi-navy',
};

export interface Service {
  id: Trade;
  name: string;
  icon: LucideIcon;
  tint: TradeTint;
}

/** Catálogo único de servicios. Lo consumen Inicio, Nueva solicitud y las tarjetas. */
export const SERVICES: readonly Service[] = [
  { id: 'Electricidad', name: 'Electricidad', icon: Zap, tint: 'orange' },
  { id: 'Cerrajería', name: 'Cerrajería', icon: KeyRound, tint: 'green' },
  { id: 'Carpintería', name: 'Carpintería', icon: Hammer, tint: 'orange' },
  { id: 'Gasfitería', name: 'Gasfitería', icon: Droplets, tint: 'blue' },
  { id: 'Instalaciones', name: 'Instalaciones', icon: Plug, tint: 'blue' },
  { id: 'Limpieza', name: 'Limpieza', icon: Sparkles, tint: 'green' },
  { id: 'Pintura', name: 'Pintura', icon: PaintRoller, tint: 'blue' },
  { id: 'Reparaciones', name: 'Reparaciones', icon: Wrench, tint: 'orange' },
];

const OTHER: Service = { id: 'Más servicios', name: 'Más servicios', icon: Ellipsis, tint: 'blue' };
const BY_ID = new Map(SERVICES.map(service => [service.id, service]));

/** El tipo Trade admite rubros fuera del catálogo; hoy ninguno tiene profesionales. */
export const serviceOf = (trade: Trade): Service => BY_ID.get(trade) ?? OTHER;
