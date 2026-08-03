'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ModalPasajeros from './ModalPasajeros';
import { BiTrash } from 'react-icons/bi';
import axios from 'axios';
import { debounce } from 'lodash';
import ModalPasajerosEdit from './ModalPasajerosEdit';
import ModalDestino from '../planificacion/ModalDestino';
import { useApi } from '@/context/ApiContext';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import '@/app/styles/pasajeros.css';
import { Download, FileText, MapPin, Search, Upload, User } from 'lucide-react';

interface Pasajero {
  codcliente: number;
  apellidos: string;
}

// Lenguaje visual compartido con gestionconductores.
const inputClass =
  'h-8 w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 text-[12px] placeholder-gray-400 transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]';
const tituloSeccionClass =
  'text-[10px] font-bold uppercase tracking-wider text-gray-500';
const iconoSeccionClass = 'h-3 w-3 text-gray-400';
// Cabecera de tarjeta separada del contenido por una línea, como en las fichas
// de los módulos de gestión.
const tarjetaClass = 'rounded-md border border-gray-200 bg-white shadow-sm';
const tarjetaCabeceraClass =
  'flex items-center gap-1.5 border-b border-gray-100 px-3 py-2';
const tarjetaCuerpoClass = 'p-3';

export default function PasajeroContent() {
  const [pasajeros, setPasajeros] = useState<
    { value: number; label: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCodCliente, setSelectedCodCliente] = useState<number | null>(
    null,
  );
  const [inputValue, setInputValue] = useState('');

  const [codigoQuery, setCodigoQuery] = useState('');
  const [codigoInputValue, setCodigoInputValue] = useState('');
  const [codigoResultados, setCodigoResultados] = useState<
    { codigo: string; codlan: string; apepate: string }[]
  >([]);
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);

  const { baseUrl } = useApi();
  const [isBaseUrlReady, setIsBaseUrlReady] = useState(false);
  const { data: session } = useSession();
  const username = session?.user.username;
  const [reloadPasajeros, setReloadPasajeros] = useState(false);

  useEffect(() => {
    if (baseUrl) {
      setIsBaseUrlReady(true);
    }
  }, [baseUrl]);

  const fetchPasajerosPorCodigo = useCallback(
    debounce(async (value: string) => {
      if (value.length < 2) {
        setCodigoResultados([]);
        return;
      }

      try {
        const response = await axios.get(
          `https://do.velsat.pe:2083/api/Pasajero/GetPasajerosCodigo?codlan=${value}`,
        );
        const data = response.data.map((item: any) => ({
          codigo: item.codigo,
          codlan: item.codlan,
          apepate: item.apepate,
        }));
        setCodigoResultados(data);
      } catch (error) {
        console.error('Error al buscar por código:', error);
      }
    }, 300),
    [],
  );

  useEffect(() => {
    if (!isBaseUrlReady) return;

    const fetchPasajeros = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Pasajero[]>(`${baseUrl}/api/Pasajero`);
        const data = response.data.map((pasajero) => ({
          value: pasajero.codcliente,
          label: pasajero.apellidos,
        }));
        setPasajeros(data);
      } catch (error) {
        console.error('Error al obtener los pasajeros:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPasajeros();
  }, [isBaseUrlReady, baseUrl, reloadPasajeros]);

  const filteredPasajeros = useMemo(() => {
    if (query.length < 2) return [];
    return pasajeros.filter((pasajero) =>
      pasajero.label?.toLowerCase().includes(query.toLowerCase() || ''),
    );
  }, [pasajeros, query]);

  const handleSearchChange = debounce((value: string) => {
    setQuery(value);
  }, 300);

  const handleSelectionChange = (value: number) => {
    const selectedPasajero = pasajeros.find(
      (pasajero) => pasajero.value === value,
    );
    if (selectedPasajero) {
      setInputValue(selectedPasajero.label);
      setQuery('');
      setSelectedCodCliente(selectedPasajero.value);
    }
  };

  const handleDelete = async () => {
    if (!selectedCodCliente) {
      alert('Seleccione un pasajero primero');
      return;
    }

    const confirmResult = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará al pasajero.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const response = await axios.delete(
        `https://do.velsat.pe:2083/api/Pasajero/Delete/${selectedCodCliente}/${username}`,
      );

      if (response.status === 200) {
        toast.success('Pasajero eliminado');
        setSelectedCodCliente(null);
        setInputValue('');
        setQuery('');

        setPasajeros((prevPasajeros) =>
          prevPasajeros.filter(
            (pasajero) => pasajero.value !== selectedCodCliente,
          ),
        );
      }
    } catch (error) {
      console.error('Error al eliminar pasajero:', error);
      toast.error('Error al agregar el pasajero');
    }
  };

  const [destinoSeleccionado, setDestinoSeleccionado] = useState<string | null>(null);

  const handleDestinoSeleccionado = (nombre: string, codigo: string) => {
    setDestinoSeleccionado(nombre);
    toast.success(`Destino seleccionado: ${nombre}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Cabecera: identidad y acción de destino */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-[#efeff0] px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 bg-[#113EB9]"></div>
          <h1 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">
            Gestión de Pasajeros
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {destinoSeleccionado && (
            <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-[#113EB9]">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                Destino: <strong>{destinoSeleccionado}</strong>
              </span>
            </div>
          )}
          <ModalDestino
            onDestinoSeleccionado={handleDestinoSeleccionado}
            trigger={
              <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#113EB9] px-3 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-[#0e3399]">
                <MapPin className="h-3.5 w-3.5" />
                <span>Seleccionar Destino</span>
              </button>
            }
          />
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* Buscar pasajero por nombre + acciones */}
        <div className={tarjetaClass}>
          <div className={tarjetaCabeceraClass}>
            <User className={iconoSeccionClass} />
            <h3 className={tituloSeccionClass}>Buscar Pasajero por Nombre</h3>
          </div>

          <div className={`${tarjetaCuerpoClass} flex items-center gap-2`}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pasajero por nombre..."
                className={`${inputClass} pl-9`}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  handleSearchChange(e.target.value);
                }}
                value={inputValue}
              />

              {query.length > 0 && query.length < 2 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                  Mínimo 2 caracteres
                </span>
              )}

              {query.length >= 2 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredPasajeros.length > 0 ? (
                    <div className="max-h-64 overflow-auto">
                      <div className="border-b border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500">
                        {filteredPasajeros.length} resultado(s)
                      </div>
                      {filteredPasajeros.map((pasajero) => (
                        <div
                          key={pasajero.value}
                          onClick={() => handleSelectionChange(pasajero.value)}
                          className="cursor-pointer border-b border-gray-50 px-2.5 py-1.5 last:border-b-0 hover:bg-blue-50"
                        >
                          <div className="text-[12px] font-medium text-gray-800">
                            {pasajero.label}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Código: {pasajero.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-2.5 py-3 text-center text-[11px] text-gray-400">
                      No se encontraron pasajeros
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <ModalPasajeros
                title="Agregar Pasajero"
                onPasajeroAgregado={() => setReloadPasajeros((prev) => !prev)}
              />
              <ModalPasajerosEdit
                title="Detalle Pasajero"
                codCliente={selectedCodCliente}
              />
              <button
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-red-600 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleDelete}
                disabled={!selectedCodCliente}
              >
                <BiTrash size={12} />
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Buscar por Código */}
          <div className={tarjetaClass}>
            <div className={tarjetaCabeceraClass}>
              <Search className={iconoSeccionClass} />
              <h3 className={tituloSeccionClass}>Buscar por Código</h3>
            </div>

            <div className={`${tarjetaCuerpoClass} flex items-center gap-2`}>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ingrese el código del pasajero..."
                  className={inputClass}
                  value={codigoInputValue}
                  onChange={(e) => {
                    setCodigoInputValue(e.target.value);
                    setCodigoQuery(e.target.value);
                    fetchPasajerosPorCodigo(e.target.value);
                  }}
                />

                {codigoQuery.length >= 2 && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    {codigoResultados.length > 0 ? (
                      <div className="max-h-64 overflow-auto">
                        <div className="border-b border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500">
                          Resultados por código
                        </div>
                        {codigoResultados.map((item) => (
                          <div
                            key={item.codigo}
                            onClick={() => {
                              setCodigoInputValue(
                                `${item.codlan} - ${item.apepate}`,
                              );
                              setSelectedCodigo(item.codigo);
                              setCodigoQuery('');
                            }}
                            className="cursor-pointer border-b border-gray-50 px-2.5 py-1.5 last:border-b-0 hover:bg-blue-50"
                          >
                            <div className="text-[12px] font-medium text-gray-800">
                              {item.codlan}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {item.apepate}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-2.5 py-3 text-center text-[11px] text-gray-400">
                        No hay resultados
                      </div>
                    )}
                  </div>
                )}
              </div>

              <ModalPasajerosEdit
                title="Detalle Pasajero"
                codCliente={Number(selectedCodigo)}
              />
            </div>
          </div>

          {/* Carga Masiva */}
          <div className={tarjetaClass}>
            <div className={tarjetaCabeceraClass}>
              <Upload className={iconoSeccionClass} />
              <h3 className={tituloSeccionClass}>Carga Masiva de Pasajeros</h3>
            </div>

            <form className={`${tarjetaCuerpoClass} flex items-center gap-2`}>
              <label
                htmlFor="file-input"
                className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-2.5 transition-colors hover:border-[#113EB9] hover:bg-blue-50"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="truncate text-[11px] text-gray-600">
                  Selecciona un archivo (Excel, CSV)
                </span>
                <input
                  type="file"
                  id="file-input"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  multiple
                />
              </label>

              <button
                type="submit"
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-brandSecondary-hover"
              >
                <Upload className="h-3 w-3" />
                Cargar
              </button>

              <button
                type="button"
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-[#113EB9] transition-colors hover:bg-blue-50"
              >
                <Download className="h-3 w-3" />
                Plantilla
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
