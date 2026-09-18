'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ModalPasajeros from './ModalPasajeros';
import ModalPasajerosEdit from './ModalPasajerosEdit';
import ModalDestino from '../planificacion/ModalDestino';
import { useApi } from '@/context/ApiContext';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import axios from 'axios';
import { debounce } from 'lodash';
import {
  Search,
  Plus,
  ChevronDown,
  Pencil,
  Trash2,
  Copy,
  MapPin,
  FileText,
  Upload,
  Download,
} from 'lucide-react';

interface Pasajero {
  codcliente: number;
  apellidos: string;
}

interface PasajeroDetalle {
  codlan?: string;
  apellidos?: string;
  telefono?: string;
  sexo?: string;
  empresa?: string;
  codusuario?: string;
  codlugar?: string;
  zona?: string | null;
  direccion?: string;
  distrito?: string;
  wy?: string;
  wx?: string;
}

export default function PasajeroContent() {
  const [pasajeros, setPasajeros] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'nombre' | 'codigo' | 'masiva'
  const [tabActivo, setTabActivo] = useState<'nombre' | 'codigo' | 'masiva'>('nombre');

  // Tab: Buscar por nombre
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const [selectedCodCliente, setSelectedCodCliente] = useState<number | null>(null);

  // Tab: Buscar por código
  const [codigoInputValue, setCodigoInputValue] = useState('');
  const [codigoResultados, setCodigoResultados] = useState<any[]>([]);

  // Caché de detalles por codcliente para no repetir peticiones
  const [detallesCache, setDetallesCache] = useState<Record<number, PasajeroDetalle>>({});

  // Destino seleccionado
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<string | null>(null);

  // Paginación
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const { data: session } = useSession();
  const username = session?.user?.username || 'admin';
  const [reloadPasajeros, setReloadPasajeros] = useState(false);

  useEffect(() => {
    if (baseUrl) {
      setIsBaseUrlReady(true);
    }
  }, [baseUrl]);

  // Carga de pasajeros en memoria
  useEffect(() => {
    if (!isBaseUrlReady) return;

    const fetchPasajeros = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Pasajero[]>(`${baseUrl}/api/Pasajero`);
        const data = response.data.map((p) => ({
          value: p.codcliente,
          label: p.apellidos,
        }));
        setPasajeros(data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchPasajeros();
  }, [isBaseUrlReady, baseUrl, reloadPasajeros]);

  // Debounce para búsqueda por nombre
  const debouncedSearch = useMemo(
    () =>
      debounce((val: string) => {
        setQuery(val);
        setPage(1);
      }, 300),
    [],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    debouncedSearch(val);
  };

  const limpiarBusqueda = () => {
    setInputValue('');
    setQuery('');
    setSelectedCodCliente(null);
    setPage(1);
  };

  // Debounce para búsqueda por código
  const fetchPasajerosPorCodigo = useCallback(
    debounce(async (value: string) => {
      const v = value.trim();
      if (v.length < 2) {
        setCodigoResultados([]);
        return;
      }

      try {
        const response = await axios.get(
          `https://do.velsat.pe:2083/api/Pasajero/GetPasajerosCodigo?codlan=${encodeURIComponent(v)}`,
        );
        setCodigoResultados(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setCodigoResultados([]);
      }
    }, 300),
    [],
  );

  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCodigoInputValue(val);
    fetchPasajerosPorCodigo(val);
  };

  const limpiarBusquedaCodigo = () => {
    setCodigoInputValue('');
    setCodigoResultados([]);
    setSelectedCodCliente(null);
    setPage(1);
  };

  // Filtrado de pasajeros por nombre
  const filteredPasajeros = useMemo(() => {
    if (!query.trim()) {
      return pasajeros;
    }
    const q = query.toLowerCase().trim();
    return pasajeros.filter((p) => p.label?.toLowerCase().includes(q));
  }, [pasajeros, query]);

  // Items de la página actual
  const itemsPagina = useMemo(() => {
    if (tabActivo === 'codigo') {
      const start = (page - 1) * rowsPerPage;
      return codigoResultados.slice(start, start + rowsPerPage);
    }
    const start = (page - 1) * rowsPerPage;
    return filteredPasajeros.slice(start, start + rowsPerPage);
  }, [tabActivo, filteredPasajeros, codigoResultados, page, rowsPerPage]);

  const totalItems =
    tabActivo === 'codigo' ? codigoResultados.length : filteredPasajeros.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  // Cargar detalles de los pasajeros de la página actual para poblar columnas
  useEffect(() => {
    if (!baseUrl || !isBaseUrlReady) return;
    if (tabActivo !== 'nombre') return;
    if (itemsPagina.length === 0) return;

    const faltantes = itemsPagina.filter((item) => !detallesCache[item.value]);
    if (faltantes.length === 0) return;

    let cancelado = false;
    faltantes.forEach(async (p) => {
      try {
        const res = await axios.get(`${baseUrl}/api/Pasajero/Detail/${p.value}`);
        if (!cancelado && res.data && res.data[0]) {
          setDetallesCache((prev) => ({
            ...prev,
            [p.value]: res.data[0],
          }));
        }
      } catch (e) {
        // Ignorar fallo de un detalle individual
      }
    });

    return () => {
      cancelado = true;
    };
  }, [baseUrl, isBaseUrlReady, itemsPagina, detallesCache, tabActivo]);

  // Acciones sobre pasajeros
  const handleDestinoSeleccionado = (nombre: string) => {
    setDestinoSeleccionado(nombre);
    toast.success(`Destino seleccionado: ${nombre}`);
  };

  const handleCopiarUbicacion = (detalle?: PasajeroDetalle, lugar?: any) => {
    const lat = detalle?.wy || lugar?.wy;
    const lng = detalle?.wx || lugar?.wx;
    const dir = detalle?.direccion || lugar?.direccion;

    if (lat && lng && Number(lat) !== 0 && Number(lng) !== 0) {
      const link = `https://www.google.com/maps?q=${lat},${lng}`;
      navigator.clipboard.writeText(link);
      toast.success('Enlace de ubicación copiado al portapapeles');
    } else if (dir) {
      navigator.clipboard.writeText(dir);
      toast.success('Dirección copiada al portapapeles');
    } else {
      toast.info('No se encontró dirección o coordenadas registradas');
    }
  };

  const confirmDelete = async (codCliente: number, nombre?: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: nombre
        ? `Esta acción eliminará al pasajero "${nombre}".`
        : 'Esta acción eliminará al pasajero seleccionado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#113EB9',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axios.delete(
        `https://do.velsat.pe:2083/api/Pasajero/Delete/${codCliente}/${username}`,
      );
      if (response.status === 200) {
        toast.success('Pasajero eliminado con éxito');
        if (selectedCodCliente === codCliente) {
          setSelectedCodCliente(null);
        }
        setPasajeros((prev) => prev.filter((p) => p.value !== codCliente));
        setCodigoResultados((prev) =>
          prev.filter((p) => Number(p.codigo) !== codCliente),
        );
        setDetallesCache((prev) => {
          const copia = { ...prev };
          delete copia[codCliente];
          return copia;
        });
      }
    } catch (error) {
      toast.error('Ocurrió un error al eliminar el pasajero');
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50">
      {/* 1. Header corporativo superior azul con logo naranja */}
      <header className="sticky top-0 z-50 bg-[#113EB9] flex-shrink-0">
        <div className="flex h-12 items-stretch justify-between">
          {/* Lado izquierdo: Logo naranja, separador y subtítulo/título */}
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image
                src="/LogoWeb.png"
                alt="Velsat"
                width={44}
                height={44}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>

            <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />

            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                OPERACIONES / MAESTROS
              </span>
              <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white flex items-center gap-1.5 uppercase">
                <span>GESTIÓN DE PASAJEROS</span>
              </h1>
            </div>
          </div>

          {/* Lado derecho: Botón Seleccionar destino y + Nuevo pasajero */}
          <div className="flex items-center gap-2 pr-4">
            {destinoSeleccionado && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] text-white">
                <MapPin className="h-3.5 w-3.5 text-blue-200" />
                <span>
                  Destino: <strong className="text-white">{destinoSeleccionado}</strong>
                </span>
              </div>
            )}

            <ModalDestino
              onDestinoSeleccionado={handleDestinoSeleccionado}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/40 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus:outline-none"
                >
                  <MapPin className="h-3.5 w-3.5 text-white" />
                  <span>Seleccionar destino</span>
                </button>
              }
            />

            <ModalPasajeros
              title="Agregar Pasajero"
              onPasajeroAgregado={() => setReloadPasajeros((prev) => !prev)}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#113EB9] transition-colors hover:bg-blue-50 focus:outline-none shadow-none"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Nuevo pasajero</span>
                </button>
              }
            />
          </div>
        </div>
      </header>

      {/* 2. Pestañas horizontales */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center gap-6 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            setTabActivo('nombre');
            setPage(1);
          }}
          className={`text-xs py-2.5 font-bold transition-colors border-b-2 ${
            tabActivo === 'nombre'
              ? 'border-[#113EB9] text-[#113EB9]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Buscar por nombre
        </button>

        <button
          type="button"
          onClick={() => {
            setTabActivo('codigo');
            setPage(1);
          }}
          className={`text-xs py-2.5 font-bold transition-colors border-b-2 ${
            tabActivo === 'codigo'
              ? 'border-[#113EB9] text-[#113EB9]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Buscar por código
        </button>

        <button
          type="button"
          onClick={() => {
            setTabActivo('masiva');
            setPage(1);
          }}
          className={`text-xs py-2.5 font-bold transition-colors border-b-2 ${
            tabActivo === 'masiva'
              ? 'border-[#113EB9] text-[#113EB9]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Carga masiva
        </button>
      </div>

      {/* 3. Barra de búsqueda y controles bajo pestañas */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        {tabActivo === 'nombre' && (
          <div className="flex flex-wrap items-center gap-2.5 w-full">
            <div className="relative w-64 sm:w-80">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Buscar por nombre..."
                className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 pl-8 text-xs text-slate-800 placeholder-slate-400 focus:border-[#113EB9] focus:outline-none transition-colors"
              />
            </div>

            {inputValue && (
              <button
                type="button"
                onClick={limpiarBusqueda}
                className="h-8 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                Limpiar
              </button>
            )}

            <span className="text-xs text-slate-400 font-normal hidden md:inline ml-1">
              Usa las acciones de cada fila para ver el detalle o eliminar.
            </span>
          </div>
        )}

        {tabActivo === 'codigo' && (
          <div className="flex flex-wrap items-center gap-2.5 w-full">
            <div className="relative w-64 sm:w-80">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={codigoInputValue}
                onChange={handleCodigoChange}
                placeholder="Buscar por código (ej. PX o número)..."
                className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 pl-8 text-xs text-slate-800 placeholder-slate-400 focus:border-[#113EB9] focus:outline-none transition-colors"
              />
            </div>

            {codigoInputValue && (
              <button
                type="button"
                onClick={limpiarBusquedaCodigo}
                className="h-8 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                Limpiar
              </button>
            )}

            <span className="text-xs text-slate-400 font-normal hidden md:inline ml-1">
              Usa las acciones de cada fila para ver el detalle o eliminar.
            </span>
          </div>
        )}

        {tabActivo === 'masiva' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.info('Funcionalidad de carga masiva en proceso');
            }}
            className="flex flex-wrap items-center gap-2.5 w-full"
          >
            <label
              htmlFor="file-input-masiva"
              className="flex h-8 min-w-[260px] sm:w-96 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 transition-colors hover:border-[#113EB9] hover:bg-blue-50/50"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate text-xs text-slate-600">
                Selecciona un archivo (Excel, CSV)
              </span>
              <input
                type="file"
                id="file-input-masiva"
                className="hidden"
                accept=".xlsx,.xls,.csv"
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#113EB9] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Cargar</span>
            </button>

            <button
              type="button"
              onClick={() => toast.info('Descargando plantilla...')}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Plantilla</span>
            </button>
          </form>
        )}
      </div>

      {/* 4. Barra de sub-cabecera con conteo de Resultados */}
      {tabActivo !== 'masiva' && (
        <div className="px-4 pt-2.5 pb-1 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Resultados</span>
            <span className="rounded-full border border-blue-200 bg-blue-50/80 px-2 py-0.5 text-[10px] font-bold text-[#113EB9]">
              {totalItems}
            </span>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Selecciona un pasajero para ver o editar su ficha
          </span>
        </div>
      )}

      {/* 5. Tabla de Pasajeros */}
      {tabActivo !== 'masiva' ? (
        <div className="mx-4 mb-3 rounded-md border border-slate-200 bg-white overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-gray-200 text-gray-700">
                <tr className="h-[30px] border-b border-gray-300">
                  <th className="w-[34px] text-center border-r border-gray-300"></th>
                  <th className="w-[10%] px-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                    CÓDIGO
                  </th>
                  <th className="w-[21%] px-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                    NOMBRE
                  </th>
                  <th className="w-[10%] px-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                    DOCUMENTO
                  </th>
                  <th className="w-[10%] px-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                    TELÉFONO
                  </th>
                  <th className="w-[11%] px-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                    DISTRITO
                  </th>
                  <th className="w-[22%] px-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                    DIRECCIÓN
                  </th>
                  <th className="w-[9%] px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                    EMPRESA
                  </th>
                  <th className="w-[7%] px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                      Cargando pasajeros...
                    </td>
                  </tr>
                ) : itemsPagina.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                      No se encontraron pasajeros registrados
                    </td>
                  </tr>
                ) : (
                  itemsPagina.map((item, idx) => {
                    if (tabActivo === 'codigo') {
                      const codId = Number(item.codigo);
                      const isSelected = selectedCodCliente === codId;
                      const lugar = item.lugar || {};
                      const codDisplay = item.codlan || `PX-${String(codId).padStart(5, '0')}`;

                      return (
                        <tr
                          key={item.codigo || idx}
                          onClick={() => setSelectedCodCliente(codId)}
                          className={`h-[32px] transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/70 hover:bg-blue-100/70'
                              : 'even:bg-slate-50/40 hover:bg-blue-50/50'
                          }`}
                        >
                          <td className="px-1 py-0.5 text-center border-r border-slate-100">
                            <span
                              className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                                isSelected
                                  ? 'border-2 border-[#113EB9] p-0.5'
                                  : 'border border-slate-300'
                              }`}
                            >
                              {isSelected && (
                                <span className="h-full w-full rounded-full bg-[#113EB9]" />
                              )}
                            </span>
                          </td>
                          <td className="px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 border-r border-slate-100 truncate">
                            {codDisplay}
                          </td>
                          <td
                            className="px-2.5 py-0.5 text-[11.5px] font-bold text-slate-900 border-r border-slate-100 truncate uppercase"
                            title={item.apepate}
                          >
                            {item.apepate}
                          </td>
                          <td className="px-2.5 py-0.5 font-mono text-[11px] text-slate-600 border-r border-slate-100 truncate">
                            {item.codlan ? `DNI ${item.codlan}` : '—'}
                          </td>
                          <td className="px-2.5 py-0.5 font-mono text-[11px] text-slate-700 border-r border-slate-100 truncate">
                            {item.telefono || item.tel || '—'}
                          </td>
                          <td
                            className="px-2.5 py-0.5 text-[11px] text-slate-700 border-r border-slate-100 truncate"
                            title={lugar.distrito}
                          >
                            {lugar.distrito || '—'}
                          </td>
                          <td
                            className="px-2.5 py-0.5 text-[11px] text-slate-600 border-r border-slate-100 truncate"
                            title={lugar.direccion}
                          >
                            {lugar.direccion || '—'}
                          </td>
                          <td className="px-1 py-0.5 text-center border-r border-slate-100 whitespace-nowrap">
                            {item.empresa ? (
                              <span className="inline-block rounded border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold uppercase text-blue-700 leading-none">
                                {item.empresa}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-1 py-0.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <ModalPasajerosEdit
                                title="Detalle Pasajero"
                                codCliente={codId}
                                onSaved={() => setReloadPasajeros((prev) => !prev)}
                                trigger={
                                  <button
                                    type="button"
                                    title="Editar ficha"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                }
                              />

                              <button
                                type="button"
                                title="Copiar dirección / ubicación"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopiarUbicacion(undefined, lugar);
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                              >
                                <Copy size={12} />
                              </button>

                              <button
                                type="button"
                                title="Eliminar pasajero"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete(codId, item.apepate);
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Tab 'nombre'
                    const codId = item.value;
                    const isSelected = selectedCodCliente === codId;
                    const detalle = detallesCache[codId];
                    const codDisplay = detalle?.codlan || `PX-${String(codId).padStart(5, '0')}`;

                    return (
                      <tr
                        key={codId}
                        onClick={() => setSelectedCodCliente(codId)}
                        className={`h-[32px] transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70 hover:bg-blue-100/70'
                            : 'even:bg-slate-50/40 hover:bg-blue-50/50'
                        }`}
                      >
                        <td className="px-1 py-0.5 text-center border-r border-slate-100">
                          <span
                            className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                              isSelected
                                ? 'border-2 border-[#113EB9] p-0.5'
                                : 'border border-slate-300'
                            }`}
                          >
                            {isSelected && (
                              <span className="h-full w-full rounded-full bg-[#113EB9]" />
                            )}
                          </span>
                        </td>
                        <td className="px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 border-r border-slate-100 truncate">
                          {codDisplay}
                        </td>
                        <td
                          className="px-2.5 py-0.5 text-[11.5px] font-bold text-slate-900 border-r border-slate-100 truncate uppercase"
                          title={item.label}
                        >
                          {item.label}
                        </td>
                        <td className="px-2.5 py-0.5 font-mono text-[11px] text-slate-600 border-r border-slate-100 truncate">
                          {detalle?.codlan ? `DNI ${detalle.codlan}` : '—'}
                        </td>
                        <td className="px-2.5 py-0.5 font-mono text-[11px] text-slate-700 border-r border-slate-100 truncate">
                          {detalle?.telefono || '—'}
                        </td>
                        <td
                          className="px-2.5 py-0.5 text-[11px] text-slate-700 border-r border-slate-100 truncate"
                          title={detalle?.distrito}
                        >
                          {detalle?.distrito || '—'}
                        </td>
                        <td
                          className="px-2.5 py-0.5 text-[11px] text-slate-600 border-r border-slate-100 truncate"
                          title={detalle?.direccion}
                        >
                          {detalle?.direccion || '—'}
                        </td>
                        <td className="px-1 py-0.5 text-center border-r border-slate-100 whitespace-nowrap">
                          {detalle?.empresa ? (
                            <span className="inline-block rounded border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold uppercase text-blue-700 leading-none">
                              {detalle.empresa}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <ModalPasajerosEdit
                              title="Detalle Pasajero"
                              codCliente={codId}
                              onSaved={() => {
                                setReloadPasajeros((prev) => !prev);
                                setDetallesCache((prev) => {
                                  const c = { ...prev };
                                  delete c[codId];
                                  return c;
                                });
                              }}
                              trigger={
                                <button
                                  type="button"
                                  title="Editar ficha"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                >
                                  <Pencil size={12} />
                                </button>
                              }
                            />

                            <button
                              type="button"
                              title="Copiar dirección / ubicación"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopiarUbicacion(detalle);
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                            >
                              <Copy size={12} />
                            </button>

                            <button
                              type="button"
                              title="Eliminar pasajero"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(codId, item.label);
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 6. Pie de tabla con paginación */}
          <div className="flex items-center justify-between bg-white px-4 py-2 border-t border-slate-200 text-xs flex-shrink-0">
            <div className="text-slate-600">
              Mostrando <strong className="text-slate-900">{itemsPagina.length}</strong> de{' '}
              <strong className="text-slate-900">{totalItems}</strong> pasajeros
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Los cambios se registran con tu usuario y fecha.
              </span>

              <div className="flex items-center gap-1.5">
                {page > 1 && (
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-[#113EB9] bg-white px-2.5 py-1 text-[11px] font-medium text-[#113EB9] hover:bg-blue-50 transition-colors"
                  >
                    Anterior
                  </button>
                )}

                <span className="px-2 text-[11px] font-medium text-slate-700">
                  Página {page} de {totalPages}
                </span>

                {page < totalPages && (
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded border border-[#113EB9] bg-white px-2.5 py-1 text-[11px] font-medium text-[#113EB9] hover:bg-blue-50 transition-colors"
                  >
                    Siguiente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vista de Carga Masiva detallada si está activa */
        <div className="mx-4 mb-3 p-6 rounded-md border border-slate-200 bg-white flex-1 flex flex-col justify-center items-center">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-[#113EB9] flex items-center justify-center mx-auto">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Carga Masiva de Pasajeros
            </h3>
            <p className="text-xs text-slate-500">
              Sube un archivo de Excel o CSV con los datos de los pasajeros para registrarlos masivamente en el sistema.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => toast.info('Descargando plantilla de pasajeros...')}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Descargar Plantilla</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
