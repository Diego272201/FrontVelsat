import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Gauge,
  HelpCircle,
  Power,
  PowerOff,
  Siren,
  Wifi,
  WifiOff,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { getAlertCatalogItem } from './alertCatalog';
import type { SeveridadAlerta } from './settingsApi';

export interface AlertVisual {
  icon: LucideIcon;
  /** Círculo del ícono (Tailwind) */
  chip: string;
  /** Etiqueta corta de la lista (Tailwind) */
  badge: string;
  /** Texto corto para la etiqueta: "Entrada", "SOS"… */
  short: string;
  /** Colores para HTML fuera de React (popup del mapa) */
  hex: { fg: string; bg: string };
}

const VISUALS: Record<string, AlertVisual> = {
  geofenceEnter: { icon: ArrowRight, chip: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-100 text-emerald-800', short: 'Entrada', hex: { fg: '#059669', bg: '#ECFDF5' } },
  geofenceExit: { icon: ArrowLeft, chip: 'bg-red-50 text-red-600', badge: 'bg-red-100 text-red-800', short: 'Salida', hex: { fg: '#DC2626', bg: '#FEF2F2' } },
  deviceOverspeed: { icon: Gauge, chip: 'bg-orange-50 text-orange-600', badge: 'bg-orange-100 text-orange-800', short: 'Exceso vel.', hex: { fg: '#EA580C', bg: '#FFF7ED' } },
  'alarm:overspeed': { icon: Gauge, chip: 'bg-amber-50 text-amber-600', badge: 'bg-amber-100 text-amber-800', short: 'Vel. GPS', hex: { fg: '#D97706', bg: '#FFFBEB' } },
  'alarm:sos': { icon: Siren, chip: 'bg-rose-100 text-rose-700', badge: 'bg-rose-600 text-white', short: 'SOS', hex: { fg: '#E11D48', bg: '#FFF1F2' } },
  'alarm:powercut': { icon: Zap, chip: 'bg-rose-50 text-rose-600', badge: 'bg-rose-100 text-rose-800', short: 'Corte energía', hex: { fg: '#E11D48', bg: '#FFF1F2' } },
  ignitionOn: { icon: Power, chip: 'bg-lime-50 text-lime-700', badge: 'bg-lime-100 text-lime-800', short: 'Encendido', hex: { fg: '#4D7C0F', bg: '#F7FEE7' } },
  ignitionOff: { icon: PowerOff, chip: 'bg-slate-100 text-slate-600', badge: 'bg-slate-200 text-slate-700', short: 'Apagado', hex: { fg: '#475569', bg: '#F1F5F9' } },
  deviceOnline: { icon: Wifi, chip: 'bg-sky-50 text-sky-600', badge: 'bg-sky-100 text-sky-800', short: 'En línea', hex: { fg: '#0284C7', bg: '#F0F9FF' } },
  deviceOffline: { icon: WifiOff, chip: 'bg-violet-50 text-violet-600', badge: 'bg-violet-100 text-violet-800', short: 'Desconectada', hex: { fg: '#7C3AED', bg: '#F5F3FF' } },
  deviceUnknown: { icon: HelpCircle, chip: 'bg-slate-100 text-slate-500', badge: 'bg-slate-200 text-slate-700', short: 'Desconocido', hex: { fg: '#64748B', bg: '#F1F5F9' } },
};

const BY_SEVERITY: Record<SeveridadAlerta, AlertVisual> = {
  critical: { icon: Siren, chip: 'bg-rose-50 text-rose-600', badge: 'bg-rose-100 text-rose-800', short: 'Crítica', hex: { fg: '#E11D48', bg: '#FFF1F2' } },
  warning: { icon: AlertTriangle, chip: 'bg-amber-50 text-amber-600', badge: 'bg-amber-100 text-amber-800', short: 'Aviso', hex: { fg: '#D97706', bg: '#FFFBEB' } },
  info: { icon: AlertTriangle, chip: 'bg-blue-50 text-[#113EB9]', badge: 'bg-blue-100 text-blue-800', short: 'Alerta', hex: { fg: '#113EB9', bg: '#EFF6FF' } },
};

/** Ícono, colores y etiqueta corta de un tipo de alerta (los tipos nuevos usan su severidad). */
export function getAlertVisual(eventKey: string, severity?: SeveridadAlerta | null): AlertVisual {
  const known = VISUALS[eventKey];
  if (known) return known;
  const sev = severity ?? getAlertCatalogItem(eventKey)?.severidad ?? 'info';
  return BY_SEVERITY[sev] ?? BY_SEVERITY.info;
}

export const SEVERITY_LABEL: Record<SeveridadAlerta, string> = {
  critical: 'Crítica',
  warning: 'Advertencia',
  info: 'Informativa',
};
