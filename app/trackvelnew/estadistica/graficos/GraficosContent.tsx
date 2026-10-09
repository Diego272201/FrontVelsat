'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  ChevronDown,
  FileText,
  Gauge,
  Loader2,
  MapPin,
  OctagonPause,
  RotateCcw,
} from 'lucide-react';
import { useApi } from '@/context/ApiContext';
import { getDeviceListUrlSelect } from '@/app/components/urlsApi/urlApi';
import EChart, { TIME_GROUP } from './EChart';
import {
  fetchGeneral,
  fetchKilometers,
  fetchRoute,
  fetchSpeed,
  fetchStops,
  GeneralPoint,
  KmItem,
  RoutePoint,
  SpeedPoint,
  StopItem,
} from './data';
import {
  formatMinutes,
  generalOption,
  kilometersOption,
  navigatorOption,
  routeOption,
  SPEED_BANDS,
  speedOption,
  stopsOption,
  TimeRange,
} from './options';

const MAX_DAYS = 11;
const FONT = "'IBM Plex Sans', 'Segoe UI', sans-serif";

type Status = 'idle' | 'loading' | 'ready' | 'error';
interface Slot<T> {
  status: Status;
  data: T;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toInputValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

type Preset = 'hoy' | 'ayer' | '3d' | '7d';

function presetRange(preset: Preset) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'ayer') {
    const start = new Date(startOfToday.getTime() - 86400000);
    return { start: toInputValue(start), end: toInputValue(new Date(startOfToday.getTime() - 60000)) };
  }
  const days = preset === '3d' ? 2 : preset === '7d' ? 6 : 0;
  return {
    start: toInputValue(new Date(startOfToday.getTime() - days * 86400000)),
    end: toInputValue(now),
  };
}

const idle = <T,>(data: T): Slot<T> => ({ status: 'idle', data });

function useSlot<T>(initial: T) {
  return useState<Slot<T>>(idle(initial));
}

const formatKm = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 });

export default function GraficosContent() {
  const { data: session } = useSession();
  const { baseUrl } = useApi();
  const username = session?.user?.username ?? '';

  const initial = useMemo(() => presetRange('hoy'), []);
  const [units, setUnits] = useState<string[]>([]);
  const [unit, setUnit] = useState('');
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [activePreset, setActivePreset] = useState<Preset | null>('hoy');
  const [limit, setLimit] = useState(100);
  const [formError, setFormError] = useState('');
  const [query, setQuery] = useState<{ unit: string; range: TimeRange } | null>(null);

  const [speed, setSpeed] = useSlot<SpeedPoint[]>([]);
  const [general, setGeneral] = useSlot<GeneralPoint[]>([]);
  const [route, setRoute] = useSlot<RoutePoint[]>([]);
  const [stops, setStops] = useSlot<StopItem[]>([]);
  const [kms, setKms] = useSlot<KmItem[]>([]);

  useEffect(() => {
    if (!baseUrl || !username) return;
    axios
      .get(getDeviceListUrlSelect(baseUrl, username))
      .then(({ data }) => {
        const ids: string[] = (Array.isArray(data) ? data : [])
          .map((d: { deviceId?: string }) => d.deviceId ?? '')
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
        setUnits(ids);
      })
      .catch(() => setUnits([]));
  }, [baseUrl, username]);

  const matchedUnit = useMemo(
    () => units.find((u) => u.toLowerCase() === unit.trim().toLowerCase()) ?? '',
    [units, unit],
  );

  const handleGenerate = useCallback(() => {
    setFormError('');
    if (!matchedUnit) {
      setFormError('Selecciona una unidad de la lista');
      return;
    }
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
      setFormError('La fecha "Hasta" debe ser posterior a "Desde"');
      return;
    }
    if (e - s > MAX_DAYS * 86400000) {
      setFormError(`El límite de fechas es de ${MAX_DAYS} días`);
      return;
    }
    if (!baseUrl || !username) {
      setFormError('No se encontró la sesión. Vuelve a iniciar sesión.');
      return;
    }

    setQuery({ unit: matchedUnit, range: { min: s, max: e } });

    const run = <T,>(
      setter: React.Dispatch<React.SetStateAction<Slot<T>>>,
      empty: T,
      loader: () => Promise<T>,
    ) => {
      setter({ status: 'loading', data: empty });
      loader()
        .then((data) => setter({ status: 'ready', data }))
        .catch(() => setter({ status: 'error', data: empty }));
    };

    run(setSpeed, [], () => fetchSpeed(baseUrl, start, end, matchedUnit, username));
    run(setGeneral, [], () => fetchGeneral(baseUrl, start, end, matchedUnit, username));
    run(setRoute, [], () => fetchRoute(baseUrl, start, end, matchedUnit, username));
    run(setStops, [], () => fetchStops(baseUrl, start, end, matchedUnit, username));
    run(setKms, [], () => fetchKilometers(baseUrl, start, end, username));
  }, [matchedUnit, start, end, baseUrl, username, setSpeed, setGeneral, setRoute, setStops, setKms]);

  const applyPreset = (preset: Preset) => {
    const r = presetRange(preset);
    setStart(r.start);
    setEnd(r.end);
    setActivePreset(preset);
  };

  const range = query?.range;

  const navigatorPoints = useMemo<SpeedPoint[]>(() => {
    if (speed.data.length) return speed.data;
    if (general.data.length) return general.data;
    return route.data;
  }, [speed.data, general.data, route.data]);

  const navigatorChart = useMemo(
    () => (range ? navigatorOption(navigatorPoints, range) : null),
    [navigatorPoints, range],
  );
  const speedChart = useMemo(
    () => (range ? speedOption(speed.data, range, limit) : null),
    [speed.data, range, limit],
  );
  const generalChart = useMemo(
    () => (range ? generalOption(general.data, range) : null),
    [general.data, range],
  );
  const routeChart = useMemo(
    () => (range ? routeOption(route.data, range) : null),
    [route.data, range],
  );
  const stopsChart = useMemo(
    () => (range ? stopsOption(stops.data, range) : null),
    [stops.data, range],
  );
  const kmChart = useMemo(
    () => (query ? kilometersOption(kms.data, query.unit) : null),
    [kms.data, query],
  );

  const speedStats = useMemo(() => {
    const d = speed.data;
    if (!d.length) return null;
    let max = 0;
    let sum = 0;
    let moving = 0;
    let over = 0;
    d.forEach((p) => {
      max = Math.max(max, p.speed);
      if (p.speed > 0) {
        sum += p.speed;
        moving++;
      }
      if (p.speed > limit) over++;
    });
    return { max, avg: moving ? sum / moving : 0, total: d.length, over };
  }, [speed.data, limit]);

  const generalStats = useMemo(() => {
    const d = general.data;
    if (!d.length) return null;
    const odo = d.filter((p) => p.odometer > 0).map((p) => p.odometer);
    const moving = d.filter((p) => p.speed > 0).length;
    return {
      total: d.length,
      moving,
      stopped: d.length - moving,
      km: odo.length ? Math.max(...odo) - Math.min(...odo) : 0,
    };
  }, [general.data]);

  const routeStats = useMemo(() => {
    const d = route.data;
    if (!d.length) return null;
    return {
      total: d.length,
      distance: d[d.length - 1].distanceKm,
      max: Math.max(...d.map((p) => p.speed)),
    };
  }, [route.data]);

  const stopsStats = useMemo(() => {
    const d = stops.data;
    if (!d.length) return null;
    const totalMin = d.reduce((acc, s) => acc + s.minutes, 0);
    const longest = d.reduce((a, b) => (b.minutes > a.minutes ? b : a), d[0]);
    return { total: d.length, totalMin, longest };
  }, [stops.data]);

  const kmStats = useMemo(() => {
    const d = kms.data;
    if (!d.length || !query) return null;
    const total = d.reduce((acc, i) => acc + i.km, 0);
    const idx = d.findIndex((i) => i.deviceId.toLowerCase() === query.unit.toLowerCase());
    return {
      units: d.length,
      total,
      own: idx >= 0 ? d[idx].km : null,
      rank: idx >= 0 ? idx + 1 : null,
    };
  }, [kms.data, query]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#f0f4f8]" style={{ fontFamily: FONT }}>
      <header className="flex min-h-[52px] flex-shrink-0 flex-wrap items-stretch bg-[#113EB9] shadow-sm">
        <div className="flex items-stretch">
          <div className="flex items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
            <Image src="/LogoWeb.png" alt="Velsat" width={44} height={44} className="h-9 w-9 object-contain" priority />
          </div>
          <div className="mx-3 h-7 w-[2px] self-center rounded-full bg-white/40" />
          <div className="flex flex-col justify-center pr-4">
            <span className="mb-0.5 text-[9.5px] font-bold uppercase leading-none tracking-wider text-blue-200">
              Flota / Reportes
            </span>
            <h1 className="flex items-center gap-1.5 whitespace-nowrap text-[14px] font-bold uppercase leading-none text-white">
              Gráficos
              {query && (
                <>
                  <span className="font-normal text-white/80">:</span>
                  <span className="text-[#ffbe0b]">{query.unit.toUpperCase()}</span>
                </>
              )}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 py-2 pl-2 pr-3">
          <FilterField label="Unidad">
            <div className="relative flex items-center">
              <input
                list="graficos-unidades"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={units.length ? 'Buscar…' : 'Cargando…'}
                className="h-full w-[132px] bg-transparent pl-2.5 pr-6 text-[12.5px] font-semibold uppercase text-slate-900 outline-none placeholder:font-normal placeholder:normal-case placeholder:text-slate-400"
              />
              <ChevronDown size={14} className="pointer-events-none absolute right-1.5 text-slate-500" />
              <datalist id="graficos-unidades">
                {units.map((u) => (
                  <option key={u} value={u.toUpperCase()} />
                ))}
              </datalist>
            </div>
          </FilterField>

          <FilterField label="Desde">
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setActivePreset(null);
              }}
              className="h-full bg-transparent px-2 text-[12.5px] text-slate-900 outline-none"
            />
          </FilterField>

          <FilterField label="Hasta">
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setActivePreset(null);
              }}
              className="h-full bg-transparent px-2 text-[12.5px] text-slate-900 outline-none"
            />
          </FilterField>

          <div className="flex h-8 items-center gap-0.5 rounded-md bg-white/10 p-0.5 ring-1 ring-inset ring-white/25">
            {(
              [
                ['hoy', 'Hoy'],
                ['ayer', 'Ayer'],
                ['3d', '3 días'],
                ['7d', '7 días'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`h-full whitespace-nowrap rounded-[4px] px-2.5 text-[12px] font-semibold transition-colors ${
                  activePreset === key
                    ? 'bg-white text-[#113EB9] shadow-sm'
                    : 'text-white hover:bg-white/15'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <FilterField label="Límite">
            <div className="flex h-full items-center">
              <input
                type="number"
                min={1}
                max={300}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))}
                className="h-full w-12 bg-transparent pl-2 text-[12.5px] text-slate-900 outline-none"
              />
              <span className="pr-2 text-[11px] text-slate-500">km/h</span>
            </div>
          </FilterField>

          <button
            type="button"
            onClick={handleGenerate}
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#FB7B0F] px-3.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[#e56d09]"
          >
            <BarChart3 size={15} />
            Generar
          </button>
        </div>
      </header>

      {formError && (
        <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-red-200 bg-red-50 px-5 py-1.5 text-[12.5px] font-medium text-red-700">
          <AlertCircle size={14} />
          {formError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {!range ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
            <BarChart3 size={40} className="text-slate-300" />
            <p className="text-[15px] font-semibold text-slate-600">Elige una unidad y un rango de fechas</p>
            <p className="text-[13px]">
              Se cargarán los gráficos de velocidad, reporte general, detalle de recorrido, paradas y kilometraje.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="border-y border-slate-200 bg-white px-2 pb-1 pt-2">
              <div className="mb-1 flex items-center justify-between px-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Rango visible · mueve o ajusta la ventana para hacer zoom en todos los gráficos
                </span>
                <span className="text-[11px] text-slate-400">También puedes arrastrar sobre cualquier gráfico</span>
              </div>
              {navigatorPoints.length ? (
                <EChart option={navigatorChart!} height={58} group={TIME_GROUP} />
              ) : (
                <div className="flex h-[58px] items-center justify-center text-[12px] text-slate-400">
                  {[speed, general, route].some((s) => s.status === 'loading') ? 'Cargando…' : 'Sin datos de velocidad'}
                </div>
              )}
            </div>

            <ChartCard
              title="Velocidad"
              icon={<Gauge size={16} />}
              status={speed.status}
              empty={!speed.data.length}
              stats={
                speedStats && [
                  ['Máxima', `${Math.round(speedStats.max)} km/h`, speedStats.max > limit ? 'text-red-600' : ''],
                  ['Promedio en marcha', `${speedStats.avg.toFixed(1)} km/h`],
                  [`Sobre ${limit} km/h`, `${speedStats.over} registros`, speedStats.over ? 'text-red-600' : ''],
                  ['Registros', speedStats.total.toLocaleString('en-US')],
                ]
              }
            >
              <EChart option={speedChart!} height={300} group={TIME_GROUP} brushZoom />
            </ChartCard>

            <ChartCard
              title="Reporte general"
              subtitle="Velocidad y odómetro"
              icon={<FileText size={16} />}
              status={general.status}
              empty={!general.data.length}
              stats={
                generalStats && [
                  ['Km en el periodo', `${formatKm(generalStats.km)} km`],
                  ['En movimiento', generalStats.moving.toLocaleString('en-US')],
                  ['Detenido', generalStats.stopped.toLocaleString('en-US')],
                  ['Registros', generalStats.total.toLocaleString('en-US')],
                ]
              }
            >
              <EChart option={generalChart!} height={300} group={TIME_GROUP} brushZoom />
            </ChartCard>

            <ChartCard
              title="Detalle de recorrido"
              subtitle="Velocidad por tramo y distancia acumulada"
              icon={<MapPin size={16} />}
              status={route.status}
              empty={!route.data.length}
              stats={
                routeStats && [
                  ['Distancia recorrida', `${formatKm(routeStats.distance)} km`],
                  ['Velocidad máxima', `${Math.round(routeStats.max)} km/h`],
                  ['Puntos GPS', routeStats.total.toLocaleString('en-US')],
                ]
              }
              legend={
                <div className="flex flex-wrap items-center gap-3">
                  {SPEED_BANDS.map((b) => (
                    <span key={b.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                      {b.label}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="w-3 border-t-2 border-dashed border-slate-700" />
                    Distancia (km, eje derecho)
                  </span>
                </div>
              }
            >
              <EChart option={routeChart!} height={300} group={TIME_GROUP} brushZoom />
            </ChartCard>

            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              <ChartCard
                title="Paradas"
                subtitle="Cada barra es una parada: su ancho es lo que duró"
                icon={<OctagonPause size={16} />}
                status={stops.status}
                empty={!stops.data.length}
                stats={
                  stopsStats && [
                    ['Paradas', String(stopsStats.total)],
                    ['Tiempo detenido', formatMinutes(stopsStats.totalMin)],
                    ['Más larga', formatMinutes(stopsStats.longest.minutes)],
                  ]
                }
                legend={
                  <div className="flex items-center gap-3">
                    {(
                      [
                        ['#f59e0b', '< 15 min'],
                        ['#FB7B0F', '15 – 60 min'],
                        ['#dc2626', '> 1 h'],
                      ] as const
                    ).map(([color, label]) => (
                      <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                        {label}
                      </span>
                    ))}
                  </div>
                }
              >
                <EChart option={stopsChart!} height={300} group={TIME_GROUP} brushZoom />
              </ChartCard>

              <ChartCard
                title="Kilometraje"
                subtitle="Km recorridos por unidad en el periodo"
                icon={<Activity size={16} />}
                status={kms.status}
                empty={!kms.data.length}
                stats={
                  kmStats && [
                    [
                      query.unit.toUpperCase(),
                      kmStats.own !== null ? `${formatKm(kmStats.own)} km` : 'Sin datos',
                      'text-[#FB7B0F]',
                    ],
                    ['Posición', kmStats.rank ? `${kmStats.rank} de ${kmStats.units}` : '—'],
                    ['Total flota', `${formatKm(kmStats.total)} km`],
                  ]
                }
              >
                <EChart option={kmChart!} height={300} />
              </ChartCard>
            </div>

            <p className="flex items-center justify-center gap-1.5 pb-2 text-[11.5px] text-slate-400">
              <RotateCcw size={12} />
              Usa el ícono de deshacer de cada gráfico o la ventana de arriba para volver a ver todo el rango.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  status: Status;
  empty: boolean;
  stats?: (readonly [string, string, string?] | [string, string, string?])[] | null;
  legend?: React.ReactNode;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, icon, status, empty, stats, legend, children }: ChartCardProps) {
  return (
    <section className="flex min-w-0 flex-col border-y border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#113EB9]/10 text-[#113EB9]">
            {icon}
          </span>
          <div className="flex flex-col">
            <h2 className="text-[13.5px] font-bold uppercase tracking-wide text-slate-900">{title}</h2>
            {subtitle && <span className="text-[11px] leading-tight text-slate-500">{subtitle}</span>}
          </div>
        </div>

        {status === 'ready' && stats && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {stats.map(([label, value, tone]) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                <span className={`text-[13px] font-semibold tabular-nums text-slate-800 ${tone ?? ''}`}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {legend && status === 'ready' && !empty && <div className="px-4 pt-2">{legend}</div>}

      <div className="relative px-2 pb-2 pt-1">
        {status === 'loading' && (
          <div className="flex h-[300px] items-center justify-center gap-2 text-[13px] text-slate-500">
            <Loader2 size={18} className="animate-spin text-[#113EB9]" />
            Cargando…
          </div>
        )}
        {status === 'error' && (
          <div className="flex h-[300px] flex-col items-center justify-center gap-1 text-center text-[13px] text-red-600">
            <AlertCircle size={22} />
            No se pudo cargar este reporte
          </div>
        )}
        {status === 'ready' && empty && (
          <div className="flex h-[300px] items-center justify-center text-[13px] text-slate-400">
            Sin registros en este rango
          </div>
        )}
        {status === 'ready' && !empty && children}
      </div>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-8 items-stretch overflow-hidden rounded-md bg-white shadow-sm">
      <span className="flex items-center border-r border-slate-200 bg-slate-100 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}
