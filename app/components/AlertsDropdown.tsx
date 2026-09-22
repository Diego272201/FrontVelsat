'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  ChevronLeft,
  Search,
  Menu,
  Gauge,
  MapPin,
  Clock,
  Navigation,
  AlertTriangle,
  X,
  Check,
  CheckCheck,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';

export interface AlertItem {
  id: string;
  title: string;
  vehicle: string;
  detail: string;
  date: string;
  type: 'speed' | 'geofence' | 'stop' | 'route' | 'battery';
  unread: boolean;
}

// Datos estáticos iniciales fieles a la interfaz solicitada
const INITIAL_ALERTS: AlertItem[] = [
  {
    id: '1',
    title: 'Exceso de velocidad',
    vehicle: 'Jeep Grand Cherokee',
    detail: '98 kph',
    date: '21-09-2026 08:47:30 PM',
    type: 'speed',
    unread: true,
  },
  {
    id: '2',
    title: 'Exceso de velocidad',
    vehicle: 'Jeep Grand Cherokee',
    detail: '98 kph',
    date: '21-09-2026 08:45:45 PM',
    type: 'speed',
    unread: true,
  },
  {
    id: '3',
    title: 'Entrada a geocerca',
    vehicle: 'MB43-CKZ697',
    detail: 'Terminal Norte',
    date: '21-09-2026 08:43:51 PM',
    type: 'geofence',
    unread: true,
  },
  {
    id: '4',
    title: 'Exceso de velocidad',
    vehicle: 'Mercedes-Benz Sprinter',
    detail: '98 kph',
    date: '21-09-2026 08:41:29 PM',
    type: 'speed',
    unread: true,
  },
  {
    id: '5',
    title: 'Detención prolongada',
    vehicle: '306-DAL462',
    detail: '42 min',
    date: '21-09-2026 08:38:20 PM',
    type: 'stop',
    unread: true,
  },
  {
    id: '6',
    title: 'Exceso de velocidad',
    vehicle: 'Jeep Grand Cherokee',
    detail: '98 kph',
    date: '21-09-2026 08:37:19 PM',
    type: 'speed',
    unread: true,
  },
  {
    id: '7',
    title: 'Salida de ruta',
    vehicle: 'S132-CML588',
    detail: '1.8 km de desvio',
    date: '21-09-2026 08:36:16 PM',
    type: 'route',
    unread: true,
  },
  {
    id: '8',
    title: 'Exceso de velocidad',
    vehicle: 'Mercedes-Benz Sprinter',
    detail: '98 kph',
    date: '21-09-2026 08:34:57 PM',
    type: 'speed',
    unread: true,
  },
  {
    id: '9',
    title: 'Detención prolongada',
    vehicle: 'V7B-954',
    detail: '35 min',
    date: '21-09-2026 08:30:12 PM',
    type: 'stop',
    unread: false,
  },
  {
    id: '10',
    title: 'Salida de geocerca',
    vehicle: 'MB43-CKZ697',
    detail: 'Planta Callao',
    date: '21-09-2026 08:24:05 PM',
    type: 'geofence',
    unread: false,
  },
  {
    id: '11',
    title: 'Exceso de velocidad',
    vehicle: 'Toyota Hilux 4x4',
    detail: '94 kph',
    date: '21-09-2026 08:18:40 PM',
    type: 'speed',
    unread: false,
  },
  {
    id: '12',
    title: 'Batería baja GPS',
    vehicle: 'F1X-823',
    detail: '11.4 V',
    date: '21-09-2026 08:10:15 PM',
    type: 'battery',
    unread: false,
  },
];

export default function AlertsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilterType, setModalFilterType] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar panel al hacer clic fuera (si el modal no está abierto)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isModalOpen) return;
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsFilterMenuOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isModalOpen]);

  // Cerrar menú de filtros al hacer clic fuera del submenú
  useEffect(() => {
    function handleClickOutsideFilter(event: MouseEvent) {
      const target = event.target as Node;
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(target)
      ) {
        setIsFilterMenuOpen(false);
      }
    }
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutsideFilter);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideFilter);
    };
  }, [isFilterMenuOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
        } else if (isFilterMenuOpen) {
          setIsFilterMenuOpen(false);
        } else {
          setIsOpen(false);
        }
      }
    }
    if (isOpen || isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isModalOpen, isFilterMenuOpen]);

  // Contadores
  const unreadCount = useMemo(
    () => alerts.filter((a) => a.unread).length,
    [alerts],
  );

  // Filtro de búsqueda del panel lateral
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (onlyUnread && !a.unread) return false;
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.vehicle.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.date.toLowerCase().includes(q)
      );
    });
  }, [alerts, searchQuery, onlyUnread, filterType]);

  // Filtro del modal completo
  const modalFilteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (modalFilterType !== 'all' && a.type !== modalFilterType) return false;
      if (!modalSearch.trim()) return true;
      const q = modalSearch.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.vehicle.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.date.toLowerCase().includes(q)
      );
    });
  }, [alerts, modalSearch, modalFilterType]);

  // Marcar todas como leídas
  const handleMarkAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, unread: false })));
  };

  // Marcar individual como leída
  const handleToggleRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, unread: !a.unread } : a)),
    );
  };

  const renderIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'speed':
        return <Gauge size={18} strokeWidth={2} className="text-blue-600" />;
      case 'geofence':
        return <MapPin size={18} strokeWidth={2} className="text-blue-600" />;
      case 'stop':
        return <Clock size={18} strokeWidth={2} className="text-blue-600" />;
      case 'route':
        return <Navigation size={18} strokeWidth={2} className="text-blue-600" />;
      default:
        return <AlertTriangle size={18} strokeWidth={2} className="text-blue-600" />;
    }
  };

  return (
    <div className="relative inline-flex items-center text-left">
      {/* Botón de la Campana en el Toolbar */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Alertas"
        className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
          isOpen
            ? 'bg-white/25 text-white shadow-inner'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <Bell size={18} className="transition-transform duration-200 hover:scale-105" />

        {/* Indicador numérico de alertas no leídas (ajustado en posición para no recortarse) */}
        {unreadCount > 0 && (
          <span className="absolute right-0 top-1 flex h-3.5 min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[9.5px] font-bold leading-none text-white shadow-sm ring-1 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel Desplegable de Alertas montado en el body: pegado a la derecha y cubriendo todo el alto */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed right-0 top-[36px] bottom-0 z-[99999] flex w-[360px] max-w-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-right-2 sm:w-[380px]"
            style={{ height: 'calc(100vh - 36px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Cerrar"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
                >
                  <ChevronLeft size={17} />
                </button>

                <div className="flex items-center gap-2">
                  <Bell size={17} className="text-blue-600" />
                  <h3 className="text-sm font-bold tracking-tight text-slate-800">
                    Alertas
                  </h3>
                </div>
              </div>

              <span className="text-xs font-medium text-slate-400">
                {alerts.length} de hoy
              </span>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="relative flex items-center gap-2 border-b border-gray-100 bg-white px-3.5 py-2.5">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar"
                  className="w-full rounded-full border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Botón de campana filtro no leídas */}
              <button
                type="button"
                onClick={() => setOnlyUnread((prev) => !prev)}
                title={onlyUnread ? 'Ver todas las alertas' : 'Ver solo no leídas'}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                  onlyUnread
                    ? 'border-blue-300 bg-blue-100 text-blue-700'
                    : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                <Bell size={15} />
              </button>

              {/* Botón de tres líneas (Menú de filtros funcional) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                  title="Opciones de filtrado"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition active:scale-95 ${
                    isFilterMenuOpen || filterType !== 'all'
                      ? 'border-[#FB7B0F] bg-orange-50 text-[#FB7B0F]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Menu size={16} />
                </button>

                {/* Popover del menú de filtros */}
                {isFilterMenuOpen && (
                  <div
                    ref={filterMenuRef}
                    className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Filtrar por tipo
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('all');
                        setIsFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        filterType === 'all'
                          ? 'bg-orange-50 font-bold text-[#FB7B0F]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>Todos los tipos</span>
                      {filterType === 'all' && <Check size={14} className="text-[#FB7B0F]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('speed');
                        setIsFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        filterType === 'speed'
                          ? 'bg-orange-50 font-bold text-[#FB7B0F]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Gauge size={13} className="text-blue-600" />
                        Exceso de velocidad
                      </span>
                      {filterType === 'speed' && <Check size={14} className="text-[#FB7B0F]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('geofence');
                        setIsFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        filterType === 'geofence'
                          ? 'bg-orange-50 font-bold text-[#FB7B0F]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-blue-600" />
                        Geocercas
                      </span>
                      {filterType === 'geofence' && <Check size={14} className="text-[#FB7B0F]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('stop');
                        setIsFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        filterType === 'stop'
                          ? 'bg-orange-50 font-bold text-[#FB7B0F]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-blue-600" />
                        Detención prolongada
                      </span>
                      {filterType === 'stop' && <Check size={14} className="text-[#FB7B0F]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('route');
                        setIsFilterMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        filterType === 'route'
                          ? 'bg-orange-50 font-bold text-[#FB7B0F]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Navigation size={13} className="text-blue-600" />
                        Salida de ruta
                      </span>
                      {filterType === 'route' && <Check size={14} className="text-[#FB7B0F]" />}
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('all');
                        setOnlyUnread(false);
                        setSearchQuery('');
                        setIsFilterMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-center rounded-lg bg-gray-50 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Badge de filtro activo si aplica */}
            {filterType !== 'all' && (
              <div className="flex items-center justify-between bg-orange-50/70 px-4 py-1.5 text-[11px] text-[#FB7B0F]">
                <span>
                  Filtro activo:{' '}
                  <strong>
                    {filterType === 'speed' && 'Exceso de velocidad'}
                    {filterType === 'geofence' && 'Geocercas'}
                    {filterType === 'stop' && 'Detención'}
                    {filterType === 'route' && 'Salida de ruta'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className="rounded p-0.5 hover:bg-orange-100"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Lista de Alertas con Scroll */}
            <div
              className="flex-1 divide-y divide-gray-100 overflow-y-auto bg-white"
              style={{ scrollbarWidth: 'thin' }}
            >
              {filteredAlerts.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center px-4 text-center text-gray-400">
                  <Bell size={28} className="mb-2 text-gray-300" />
                  <p className="text-xs font-medium">No se encontraron alertas</p>
                  {(searchQuery || filterType !== 'all' || onlyUnread) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                        setOnlyUnread(false);
                      }}
                      className="mt-2 text-[11px] font-semibold text-[#FB7B0F] hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleToggleRead(alert.id)}
                    className={`group flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                      alert.unread ? 'bg-white' : 'bg-slate-50/40 opacity-75'
                    }`}
                  >
                    {/* Icono circular con velocímetro */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1fd] text-blue-600 shadow-sm transition-transform group-hover:scale-105">
                      {renderIcon(alert.type)}
                    </div>

                    {/* Contenido de la alerta */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold leading-snug text-slate-900">
                        {alert.title}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-normal leading-tight text-slate-600">
                        {alert.vehicle}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-medium leading-tight text-slate-800">
                        {alert.detail}
                      </p>
                      <p className="mt-1 text-[10.5px] font-normal text-gray-400">
                        {alert.date}
                      </p>
                    </div>

                    {/* Punto indicador de no leído */}
                    {alert.unread && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer con Acciones */}
            <div className="flex items-center gap-2 border-t border-gray-200 bg-white p-3">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex-1 rounded-lg bg-[#FB7B0F] px-4 py-2.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-[#ea6f08] active:scale-[0.99]"
              >
                Marcar todas como leidas
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-xs font-semibold text-slate-700 transition hover:bg-gray-50 active:scale-[0.99]"
              >
                Ver todas
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Completo: "Ver todas las alertas" */}
      {isModalOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
            <div
              className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#FB7B0F]">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Registro Completo de Alertas
                    </h3>
                    <p className="text-xs text-slate-500">
                      Historial detallado de alertas generadas en el sistema
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filtros dentro del modal */}
              <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Pestañas de categorías */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: 'Todas' },
                      { id: 'speed', label: 'Velocidad' },
                      { id: 'geofence', label: 'Geocercas' },
                      { id: 'stop', label: 'Detenciones' },
                      { id: 'route', label: 'Rutas' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setModalFilterType(cat.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          modalFilterType === cat.id
                            ? 'bg-[#FB7B0F] text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Input de búsqueda */}
                  <div className="relative w-64 max-w-full">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Buscar por placa, tipo..."
                      className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-gray-400 focus:border-[#FB7B0F] focus:outline-none focus:ring-1 focus:ring-[#FB7B0F]"
                    />
                  </div>
                </div>
              </div>

              {/* Lista de alertas del modal */}
              <div className="flex-1 divide-y divide-gray-100 overflow-y-auto px-6 py-2">
                {modalFilteredAlerts.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-center text-gray-400">
                    <Bell size={32} className="mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No se encontraron alertas con estos criterios</p>
                  </div>
                ) : (
                  modalFilteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between py-3 transition hover:bg-slate-50/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          {renderIcon(alert.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900">
                              {alert.title}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                alert.unread
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {alert.unread ? 'No leída' : 'Leída'}
                            </span>
                          </div>
                          <p className="text-[12px] font-medium text-slate-600">
                            {alert.vehicle} •{' '}
                            <span className="font-semibold text-slate-800">
                              {alert.detail}
                            </span>
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {alert.date}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleRead(alert.id)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                          alert.unread
                            ? 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {alert.unread ? 'Marcar leída' : 'Marcar no leída'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3.5 bg-gray-50">
                <span className="text-xs text-gray-500">
                  Total: <strong>{modalFilteredAlerts.length}</strong> alertas
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="rounded-lg bg-[#FB7B0F] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#ea6f08]"
                  >
                    Marcar todas como leídas
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
