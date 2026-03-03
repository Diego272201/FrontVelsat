'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  Polygon,
  CircleMarker,
  Polyline,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import {
  Plus,
  Trash2,
  CircleDot,
  Hexagon,
  Target,
  X,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  Shield,
  ChevronRight,
  Crosshair,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE = 'https://sub.velsat.pe:2096/api/Geocerca';

const center: [number, number] = [-9.22812, -75.78894];

type GeoType = 'circular' | 'poligonal';

// ── API types ─────────────────────────────────────────────────────────────────
interface ApiGeocerca {
  idgeocerca: number;
  usuario: string;
  nombre?: string | null;
  tipo: '1' | '2';
  radio: number | null;
  puntoorigen: string;
  segundopunto: string | null;
  tercerpunto: string | null;
  puntofinal: string | null;
}

// ── Local display type ────────────────────────────────────────────────────────
interface Geocerca {
  id: number;
  name: string;
  type: GeoType;
  color: string;
  center?: [number, number];
  radius?: number;
  points?: [number, number][];
}

interface FormState {
  name: string;
  type: GeoType;
  color: string;
  radius: number;
  centerLatLon: string;
  points: string[]; // always 4 slots
}

const COLORS = [
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Morado', value: '#a855f7' },
  { label: 'Amarillo', value: '#eab308' },
];

const COLOR_CYCLE = COLORS.map((c) => c.value);

// ── Format radius for display ─────────────────────────────────────────────────
function formatRadius(m: number): string {
  if (m === 0) return '0 m';
  if (m < 1000) return `${m.toLocaleString()} m`;
  return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km`;
}

// ── Parse "lat, lon" string ───────────────────────────────────────────────────
function parseLatLon(str: string | null | undefined): [number, number] | null {
  if (!str) return null;
  const parts = str.split(',').map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
    return [parts[0], parts[1]];
  return null;
}

// ── Map API response → local Geocerca ─────────────────────────────────────────
function fromApi(g: ApiGeocerca, colorIdx: number): Geocerca | null {
  const color = COLOR_CYCLE[colorIdx % COLOR_CYCLE.length];
  if (g.tipo === '1') {
    const c = parseLatLon(g.puntoorigen);
    if (!c) return null;
    return {
      id: g.idgeocerca,
      name: g.nombre?.trim() || `Geocerca #${g.idgeocerca}`,
      type: 'circular',
      color,
      center: c,
      radius: g.radio ?? 0,
    };
  } else {
    const pts = [g.puntoorigen, g.segundopunto, g.tercerpunto, g.puntofinal]
      .map(parseLatLon)
      .filter(Boolean) as [number, number][];
    if (pts.length < 3) return null;
    return {
      id: g.idgeocerca,
      name: g.nombre?.trim() || `Geocerca #${g.idgeocerca}`,
      type: 'poligonal',
      color,
      points: pts,
    };
  }
}

// ── FlyTo helper — uses fitBounds for precise framing ────────────────────────
function FlyToController({
  target,
}: {
  target: { bounds: [[number, number], [number, number]] } | null;
}) {
  const map = useMap();
  const prevTarget = useRef<typeof target>(null);
  if (target && target !== prevTarget.current) {
    prevTarget.current = target;
    // Stop any ongoing animation before starting a new one
    map.stop();
    map.flyToBounds(target.bounds, {
      padding: [60, 60],
      maxZoom: 18,
      duration: 1.0,
    });
  }
  return null;
}

// ── Map click handler ─────────────────────────────────────────────────────────
function MapClickHandler({
  active,
  mode,
  onCircularClick,
  onPolygonClick,
}: {
  active: boolean;
  mode: GeoType;
  onCircularClick: (latlng: [number, number]) => void;
  onPolygonClick: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (!active) return;
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
      if (mode === 'circular') onCircularClick(latlng);
      else onPolygonClick(latlng);
    },
  });
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MapComponent() {
  const { data: session } = useSession(); // ✅ Dentro del componente
  const USUARIO = session?.user?.username ?? '';

  const [geocercas, setGeocercas] = useState<Geocerca[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [showPanel, setShowPanel] = useState(false);
  const [pickingOnMap, setPickingOnMap] = useState(false);
  const [pickingPointIndex, setPickingPointIndex] = useState<number | null>(
    null,
  );
  const [draftPoints, setDraftPoints] = useState<([number, number] | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [flyTarget, setFlyTarget] = useState<{
    bounds: [[number, number], [number, number]];
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: '',
    type: 'circular',
    color: COLORS[0].value,
    radius: 500,
    centerLatLon: '',
    points: ['', '', '', ''],
  });

  // ── Fetch geocercas ─────────────────────────────────────────────────────────
  const fetchGeocercas = useCallback(async () => {
    if (!USUARIO) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/GetGeocercas?usuario=${USUARIO}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiGeocerca[] = await res.json();
      const parsed = data
        .map((g, i) => fromApi(g, i))
        .filter(Boolean) as Geocerca[];
      setGeocercas(parsed);
    } catch (e: any) {
      setApiError('No se pudo cargar las geocercas: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [USUARIO]);

  useEffect(() => {
    fetchGeocercas();
  }, [fetchGeocercas]);

  // ── Form helpers ────────────────────────────────────────────────────────────
  const resetForm = () =>
    setForm({
      name: '',
      type: 'circular',
      color: COLORS[0].value,
      radius: 500,
      centerLatLon: '',
      points: ['', '', '', ''],
    });

  const handleOpen = () => {
    resetForm();
    setShowPanel(true);
    setPickingOnMap(false);
    setPickingPointIndex(null);
    setDraftPoints([null, null, null, null]);
  };

  const handleCancel = () => {
    setShowPanel(false);
    setPickingOnMap(false);
    setPickingPointIndex(null);
    setDraftPoints([null, null, null, null]);
  };

  // ── Map picking ─────────────────────────────────────────────────────────────
  const handleCircularMapClick = useCallback(
    (latlng: [number, number]) => {
      if (!pickingOnMap) return;
      setForm((f) => ({
        ...f,
        centerLatLon: `${latlng[0].toFixed(6)}, ${latlng[1].toFixed(6)}`,
      }));
      setPickingOnMap(false);
    },
    [pickingOnMap],
  );

  const handlePolygonMapClick = useCallback(
    (latlng: [number, number]) => {
      if (pickingPointIndex === null) return;
      const currentIndex = pickingPointIndex;

      setDraftPoints((prev) => {
        const next = [...prev] as ([number, number] | null)[];
        next[currentIndex] = latlng;
        return next;
      });

      setForm((f) => {
        const pts = [...f.points];
        pts[currentIndex] = `${latlng[0].toFixed(6)}, ${latlng[1].toFixed(6)}`;

        let nextIndex: number | null = null;
        for (let i = currentIndex + 1; i < pts.length; i++) {
          if (!pts[i].trim()) {
            nextIndex = i;
            break;
          }
        }
        if (nextIndex === null) {
          for (let i = 0; i < currentIndex; i++) {
            if (!pts[i].trim()) {
              nextIndex = i;
              break;
            }
          }
        }
        setTimeout(() => {
          setPickingPointIndex(nextIndex);
          if (nextIndex === null) setPickingOnMap(false);
        }, 0);
        return { ...f, points: pts };
      });
    },
    [pickingPointIndex],
  );

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) return alert('Ingresa un nombre.');

    // Helper: format coordinate pair as API expects "lat, lon" string
    const fmtCoord = (p: [number, number]): string => `${p[0]}, ${p[1]}`;

    let body: Record<string, string | null>;

    if (form.type === 'circular') {
      const c = parseLatLon(form.centerLatLon);
      if (!c) return alert('Punto central inválido. Usa formato: lat, lon');
      body = {
        usuario: USUARIO,
        nombre: form.name.trim(),
        tipo: '1',
        radio: String(form.radius),
        puntoorigen: fmtCoord(c),
        segundopunto: null,
        tercerpunto: null,
        puntofinal: null,
      };
    } else {
      const parsed = form.points.map(parseLatLon);
      const validCount = parsed.filter(Boolean).length;
      if (validCount < 4) return alert('Necesitas los 4 puntos obligatorios.');
      body = {
        usuario: USUARIO,
        nombre: form.name.trim(),
        tipo: '2',
        radio: null,
        puntoorigen: fmtCoord(parsed[0]!),
        segundopunto: parsed[1] ? fmtCoord(parsed[1]) : null,
        tercerpunto: parsed[2] ? fmtCoord(parsed[2]) : null,
        puntofinal: parsed[3] ? fmtCoord(parsed[3]) : null,
      };
    }

    console.log('[InsertGeocerca] body →', JSON.stringify(body, null, 2));

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/InsertGeocerca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Intentar leer mensaje de error del servidor
        let errMsg = `HTTP ${res.status}`;
        try {
          const errBody = await res.text();
          if (errBody) errMsg += ` — ${errBody}`;
        } catch (_) {}
        throw new Error(errMsg);
      }

      await fetchGeocercas();
      setShowPanel(false);
      setPickingOnMap(false);
      setPickingPointIndex(null);
      setDraftPoints([null, null, null, null]);
    } catch (e: any) {
      alert('Error al crear geocerca: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const confirmDelete = (id: number, name: string) =>
    setDeleteConfirm({ id, name });

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE}/DeleteGeocerca?id=${deleteConfirm.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchGeocercas();
      setDeleteConfirm(null);
    } catch (e: any) {
      alert('Error al eliminar geocerca: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Fly to — fitBounds para encuadrar exactamente la geocerca ───────────────
  const flyToGeocerca = (g: Geocerca) => {
    if (g.type === 'circular' && g.center) {
      const r = g.radius ?? 0;
      if (r <= 0) {
        // Sin radio: pequeño bbox alrededor del punto
        const delta = 0.001;
        setFlyTarget({
          bounds: [
            [g.center[0] - delta, g.center[1] - delta],
            [g.center[0] + delta, g.center[1] + delta],
          ],
        });
      } else {
        // Convertir radio (m) a grados aprox para bbox
        const latDelta = r / 111320;
        const lngDelta = r / (111320 * Math.cos((g.center[0] * Math.PI) / 180));
        setFlyTarget({
          bounds: [
            [g.center[0] - latDelta, g.center[1] - lngDelta],
            [g.center[0] + latDelta, g.center[1] + lngDelta],
          ],
        });
      }
    } else if (g.type === 'poligonal' && g.points && g.points.length > 0) {
      const lats = g.points.map((p) => p[0]);
      const lngs = g.points.map((p) => p[1]);
      setFlyTarget({
        bounds: [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ],
      });
    }
  };

  const isPickingAny = pickingOnMap || pickingPointIndex !== null;
  const cancelPicking = () => {
    setPickingOnMap(false);
    setPickingPointIndex(null);
  };

  return (
    <div className="relative h-screen w-full font-sans">
      {/* ── Picking banner ── */}
      {isPickingAny && (
        <div className="pointer-events-auto absolute left-1/2 top-4 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/85 px-5 py-2.5 text-sm text-white shadow-xl">
          <Crosshair size={15} className="animate-pulse text-amber-400" />
          <span>Haz clic en el mapa para colocar el punto</span>
          <button
            onClick={cancelPicking}
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* ── Map ── */}
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        style={{
          height: '100%',
          width: '100%',
          cursor: isPickingAny ? 'crosshair' : 'grab',
        }}
        zoomControl={false}
        maxZoom={19}
        minZoom={1}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FlyToController target={flyTarget} />
        <MapClickHandler
          active={isPickingAny}
          mode={form.type}
          onCircularClick={handleCircularMapClick}
          onPolygonClick={handlePolygonMapClick}
        />

        {/* Draft polygon preview */}
        {showPanel &&
          form.type === 'poligonal' &&
          (() => {
            const validDrafts = draftPoints.filter(Boolean) as [
              number,
              number,
            ][];
            return (
              <>
                {validDrafts.length >= 2 && (
                  <Polyline
                    positions={validDrafts}
                    pathOptions={{
                      color: form.color,
                      weight: 2,
                      dashArray: '6,4',
                      opacity: 0.8,
                    }}
                  />
                )}
                {validDrafts.length >= 3 && (
                  <Polyline
                    positions={[
                      validDrafts[validDrafts.length - 1],
                      validDrafts[0],
                    ]}
                    pathOptions={{
                      color: form.color,
                      weight: 2,
                      dashArray: '6,4',
                      opacity: 0.5,
                    }}
                  />
                )}
                {draftPoints.map((pt, idx) =>
                  pt ? (
                    <CircleMarker
                      key={idx}
                      center={pt}
                      radius={8}
                      pathOptions={{
                        color: '#fff',
                        fillColor: form.color,
                        fillOpacity: 1,
                        weight: 2,
                      }}
                    />
                  ) : null,
                )}
              </>
            );
          })()}

        {/* Rendered geocercas */}
        {geocercas.map((g) => {
          if (g.type === 'circular' && g.center) {
            const r = g.radius ?? 0;
            // Radio 0 o negativo → marcador puntual visible
            if (r <= 0) {
              return (
                <CircleMarker
                  key={g.id}
                  center={g.center}
                  radius={6}
                  pathOptions={{
                    color: g.color,
                    fillColor: g.color,
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                />
              );
            }
            return (
              <Circle
                key={g.id}
                center={g.center}
                radius={r}
                pathOptions={{
                  color: g.color,
                  fillColor: g.color,
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
            );
          }
          if (g.type === 'poligonal' && g.points) {
            return (
              <Polygon
                key={g.id}
                positions={g.points}
                pathOptions={{
                  color: g.color,
                  fillColor: g.color,
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
            );
          }
          return null;
        })}
      </MapContainer>

      {/* ── Zoom controls ── */}
      <div className="absolute bottom-6 right-4 z-[500] flex flex-col gap-1.5">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-bold text-gray-700 shadow-md hover:bg-gray-50"
          onClick={() =>
            (
              document.querySelector('.leaflet-container') as any
            )?._leaflet_map?.zoomIn()
          }
        >
          +
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg font-bold text-gray-700 shadow-md hover:bg-gray-50"
          onClick={() =>
            (
              document.querySelector('.leaflet-container') as any
            )?._leaflet_map?.zoomOut()
          }
        >
          −
        </button>
      </div>

      {/* ── Sidebar ── */}
      <div className="absolute left-4 top-4 z-[500] w-64">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-white/80" />
              <span className="text-sm font-semibold tracking-wide text-white">
                Geocercas
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                {geocercas.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchGeocercas}
                disabled={loading}
                className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                title="Recargar"
              >
                <RefreshCw
                  size={13}
                  className={loading ? 'animate-spin' : ''}
                />
              </button>
              <button
                onClick={handleOpen}
                className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-400"
              >
                <Plus size={13} /> Nueva
              </button>
            </div>
          </div>

          {apiError && (
            <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle
                size={14}
                className="mt-0.5 flex-shrink-0 text-red-400"
              />
              <p className="text-xs text-red-600">{apiError}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-xs text-gray-400">
              <Loader2 size={22} className="animate-spin text-blue-400" />
              Cargando geocercas…
            </div>
          ) : geocercas.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              <FolderOpen size={28} className="mx-auto mb-2 text-gray-300" />
              Sin geocercas aún.
              <br />
              Crea una nueva.
            </div>
          ) : (
            <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
              {geocercas.map((g) => (
                <li
                  key={g.id}
                  className="group flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50"
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  <button
                    onClick={() => flyToGeocerca(g)}
                    className="group/fly flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    title="Ir a geocerca"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-tight text-gray-800">
                        {g.name}
                      </p>
                      <p className="flex items-center gap-1 text-xs capitalize text-gray-400">
                        {g.type === 'circular' ? (
                          <CircleDot size={10} />
                        ) : (
                          <Hexagon size={10} />
                        )}
                        {g.type}
                        {g.type === 'circular' && (
                          <span className="ml-1 text-gray-300">
                            · {formatRadius(g.radius ?? 0)}
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronRight
                      size={13}
                      className="flex-shrink-0 text-gray-300 opacity-0 transition-opacity group-hover/fly:opacity-100"
                    />
                  </button>
                  <button
                    onClick={() => confirmDelete(g.id, g.name)}
                    className="rounded-lg p-1 text-red-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    title="Eliminar geocerca"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteConfirm && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-80 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-col items-center bg-red-50 px-6 pb-4 pt-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                ¿Eliminar geocerca?
              </h3>
              <p className="mt-1.5 text-sm text-gray-500">
                Estás a punto de eliminar{' '}
                <span className="font-semibold text-gray-700">
                  &quot;{deleteConfirm.name}&quot;
                </span>
                . Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2 p-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white shadow-md shadow-red-100 transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Creation Panel ── */}
      {showPanel && !isPickingAny && (
        <div className="absolute inset-0 z-[600] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-white/80" />
                <h2 className="text-base font-bold tracking-wide text-white">
                  Crear Geocerca
                </h2>
              </div>
              <button
                onClick={handleCancel}
                className="text-white/60 transition-colors hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-gray-100">
              {(['circular', 'poligonal'] as GeoType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                    form.type === t
                      ? 'border-b-2 border-blue-500 bg-blue-50/50 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t === 'circular' ? (
                    <CircleDot size={15} />
                  ) : (
                    <Hexagon size={15} />
                  )}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-5 p-6">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Almacén Central"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Color */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Color
                </label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                      className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${form.color === c.value ? 'scale-110 ring-2 ring-gray-400 ring-offset-2' : ''}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Circular fields */}
              {form.type === 'circular' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Radio:{' '}
                      <span className="font-bold text-blue-600">
                        {formatRadius(form.radius)}
                      </span>
                    </label>
                    {/* Slider 0 – 50 000 m */}
                    <input
                      type="range"
                      min={0}
                      max={50000}
                      step={
                        form.radius < 100 ? 1 : form.radius < 1000 ? 10 : 100
                      }
                      value={form.radius}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          radius: parseInt(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-500"
                    />
                    <div className="mt-0.5 flex justify-between text-xs text-gray-300">
                      <span>0 m</span>
                      <span>50 km</span>
                    </div>
                    {/* Input numérico directo para precisión */}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={50000}
                        value={form.radius}
                        onChange={(e) => {
                          const v = Math.max(
                            0,
                            Math.min(50000, parseInt(e.target.value) || 0),
                          );
                          setForm((f) => ({ ...f, radius: v }));
                        }}
                        className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <span className="text-xs text-gray-400">
                        metros (0 – 50 000)
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Punto Central (Lat, Lon){' '}
                      <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="-9.228120, -75.788940"
                        value={form.centerLatLon}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            centerLatLon: e.target.value,
                          }))
                        }
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={() => {
                          setPickingOnMap(true);
                          setPickingPointIndex(null);
                        }}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          pickingOnMap
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Seleccionar en mapa"
                      >
                        <Target size={15} />{' '}
                        <span className="text-xs">Mapa</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Polygonal fields — always 4 points */}
              {form.type === 'poligonal' && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Puntos{' '}
                    <span className="text-gray-400">
                      (4 puntos obligatorios)
                    </span>
                  </label>
                  <div className="space-y-2">
                    {form.points.map((pt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600"
                          // ← Eliminar la condición ternaria, siempre azul
                        >
                          {idx + 1}
                        </span>

                        <input
                          type="text"
                          placeholder="Lat, Lon" // ← Quitar "(opcional)"
                          value={pt}
                          onChange={(e) => {
                            const pts = [...form.points];
                            pts[idx] = e.target.value;
                            setForm((f) => ({ ...f, points: pts }));
                          }}
                          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
                          // ← Eliminar la condición ternaria, siempre igual
                        />
                        <button
                          onClick={() => {
                            setPickingPointIndex(idx);
                            setPickingOnMap(false);
                          }}
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                            pickingPointIndex === idx
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Seleccionar en mapa"
                        >
                          <Target size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
                >
                  <X size={14} /> Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200 transition-all hover:from-blue-700 hover:to-blue-600 active:scale-95 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  {saving ? 'Creando…' : 'Crear Geocerca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
