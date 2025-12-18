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

  const handleDestinoSeleccionado = (nombre: string, codigo: string) => {
    toast.success(`Destino seleccionado: ${nombre}`);
  };

  return (
    <>
      <div className="cabeceraPasajero sticky top-0 z-50">
        <div className="contenedorcabecera">
          <span className="titulocabecera">GESTIÓN DE PASAJEROS</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            <h3 className="text-base font-semibold text-gray-800">
              Buscar Pasajero por Nombre
            </h3>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escriba el nombre del pasajero..."
                  className="w-full rounded-lg border-2 border-gray-200 bg-white p-2 text-sm 
                           transition-all duration-200 focus:border-blue-400 focus:outline-none
                           focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    handleSearchChange(e.target.value);
                  }}
                  value={inputValue}
                />

                {query.length > 0 && query.length < 2 && (
                  <div className="absolute right-3 top-3 text-xs text-gray-400">
                    Escriba al menos 2 caracteres
                  </div>
                )}

                {query.length >= 2 && (
                  <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-xl">
                    {filteredPasajeros.length > 0 ? (
                      <div className="max-h-64 overflow-auto">
                        <div className="border-b bg-gray-50 p-2 text-xs font-medium text-gray-600">
                          {filteredPasajeros.length} resultado(s) encontrado(s)
                        </div>
                        {filteredPasajeros.map((pasajero, index) => (
                          <div
                            key={pasajero.value}
                            onClick={() =>
                              handleSelectionChange(pasajero.value)
                            }
                            className="cursor-pointer border-b border-gray-50 px-4 py-3 text-sm transition-colors
                                     duration-150 last:border-b-0 hover:bg-blue-50"
                          >
                            <div className="font-medium text-gray-800">
                              {pasajero.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              Código: {pasajero.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <Search className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <div className="text-sm text-gray-400">
                          No se encontraron pasajeros
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Intente con otro nombre
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              <ModalPasajeros
                title="Agregar Pasajero"
                onPasajeroAgregado={() => setReloadPasajeros((prev) => !prev)}
              />
              <ModalPasajerosEdit
                title="DETALLE PASAJERO"
                codCliente={selectedCodCliente}
              />
              <button
                className="inline-flex h-[40px] items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-red-600"
                onClick={handleDelete}
                disabled={!selectedCodCliente}
              >
                <BiTrash size={16} />
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 px-6 py-2">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-500" />
            <h3 className="text-base font-semibold text-gray-800">
              Buscar por Código
            </h3>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ingrese el código del pasajero..."
                className="w-full rounded-lg border-2 border-gray-200 bg-white p-2 text-sm
                         transition-all duration-200 focus:border-purple-400 focus:outline-none
                         focus:ring-2 focus:ring-purple-100"
                value={codigoInputValue}
                onChange={(e) => {
                  setCodigoInputValue(e.target.value);
                  setCodigoQuery(e.target.value);
                  fetchPasajerosPorCodigo(e.target.value);
                }}
              />

              {codigoQuery.length >= 2 && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-xl">
                  {codigoResultados.length > 0 ? (
                    <div className="max-h-64 overflow-auto">
                      <div className="border-b bg-gray-50 p-2 text-xs font-medium text-gray-600">
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
                          className="cursor-pointer border-b border-gray-50 px-4 py-3 transition-colors duration-150
                                   last:border-b-0 hover:bg-purple-50"
                        >
                          <div className="font-medium text-gray-800">
                            {item.codlan}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.apepate}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <div className="text-sm text-gray-400">
                        No hay resultados
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <ModalPasajerosEdit
              title="📋 Ver Detalle"
              codCliente={Number(selectedCodigo)}
            />
          </div>
        </div>

        {/* Selector de Destino */}
        <div className="border-b border-gray-100 px-6 py-2">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-800">
              Seleccionar Destino
            </h3>
          </div>
          <ModalDestino onDestinoSeleccionado={handleDestinoSeleccionado} />
        </div>

        {/* Carga Masiva - Mejorada */}
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-500" />
            <h3 className="text-base font-semibold text-gray-800">
              Carga Masiva de Pasajeros
            </h3>
          </div>

          <form className="space-y-4">
            <div className="relative">
              <label
                htmlFor="file-input"
                className="group block w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 
                         bg-gray-50 p-8 text-center transition-all duration-200
                         hover:border-green-400 hover:bg-green-50"
              >
                <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400 transition-colors group-hover:text-green-500" />
                <div className="font-medium text-gray-700 group-hover:text-green-700">
                  Arrastra tus archivos aquí
                </div>
                <div className="mt-1 text-sm text-gray-500 group-hover:text-green-600">
                  o haz clic para seleccionar (Excel, CSV)
                </div>
                <input
                  type="file"
                  id="file-input"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  multiple
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 text-sm
                         font-medium text-white shadow-sm transition-colors duration-200 hover:bg-green-600"
              >
                <Upload className="h-4 w-4" />
                Cargar Archivos
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4
                         py-3 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Plantilla
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
