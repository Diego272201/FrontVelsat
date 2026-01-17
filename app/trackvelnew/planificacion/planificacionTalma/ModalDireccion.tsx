'use client';
import React, { useState } from 'react';
import { MapPin, X, Trash2, Plus, Loader2 } from 'lucide-react';
import { useFetchTalma } from './Usefetchtalma';
import { Spinner } from '@nextui-org/react';

interface ModalDireccionProps {
  isOpen: boolean;
  onClose: () => void;
  pasajero: {
    id: string;
    nombre: string;
    direccion: string;
    distrito: string;
    codlan?: string;
  };
}

interface Direccion {
  codlugar: number;
  codcli: string;
  direccion: string;
  distrito: string;
  wy: string;
  wx: string;
  estado: string;
  codcliente: string | null;
  referencia: string | null;
  zona: string | null;
}

const ModalDireccion: React.FC<ModalDireccionProps> = ({
  isOpen,
  onClose,
  pasajero,
}) => {
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);

  // Usar el custom hook - solo hace fetch cuando isOpen es true y hay codlan
  const url = isOpen && pasajero.codlan 
    ? `https://do.velsat.pe:2083/api/Preplan/lugares/${pasajero.codlan}`
    : null;

  const { data: direcciones, loading: cargando, error } = useFetchTalma<Direccion[]>(url);

  return (
    <>
      {isOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4 backdrop-blur-sm duration-200">
          <div className="animate-in zoom-in-95 w-full max-w-3xl transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-200">
            {/* Header with gradient */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 opacity-10"></div>
              <div className="relative flex items-center justify-between border-b-2 border-blue-100 px-6 py-3">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2 shadow-lg">
                    <MapPin className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-blue-600">
                      Seleccionar Dirección - {pasajero.codlan || 'N/A'}
                    </p>
                    <h2 className="text-[14px] font-bold text-gray-800 uppercase">
                      {pasajero.nombre}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="group rounded-xl p-2.5 transition-all duration-200 hover:bg-blue-50"
                >
                  <X className="h-5 w-5 text-gray-500 transition-colors group-hover:text-blue-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-700">
                  <div className="h-5 w-1 rounded-full bg-blue-500"></div>
                  Direcciones Registradas
                </h3>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {direcciones?.length || 0}
                  {direcciones?.length === 1 ? ' dirección' : 'direcciones'}
                </span>
              </div>

              {/* Address List */}
              <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
                {cargando ? (

                  <div className="flex flex-col items-center justify-center py-12">
                      <Spinner color="primary" />
                    <p className="text-sm text-gray-600">Cargando Direcciones</p>
                  </div>

                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MapPin className="mb-3 h-12 w-12 text-red-300" />
                    <p className="text-sm text-red-600">Error al cargar direcciones</p>
                    <p className="text-xs text-gray-500 mt-1">{error}</p>
                  </div>
                ) : !direcciones || direcciones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MapPin className="mb-3 h-12 w-12 text-gray-300" />
                    <p className="text-sm text-gray-600">No hay direcciones registradas</p>
                  </div>
                ) : (
                  direcciones.map((addr) => (
                    <div
                      key={addr.codlugar}
                      className={`group flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-2 transition-all duration-200 ${
                        selectedAddress === addr.codlugar
                          ? 'border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 '
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                      onClick={() => setSelectedAddress(addr.codlugar)}
                    >
                      {/* Radio Button */}
                      <div className="mt-2.5 flex-shrink-0">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                            selectedAddress === addr.codlugar
                              ? 'border-blue-500 bg-blue-500 shadow-md'
                              : 'border-gray-300 group-hover:border-blue-400'
                          }`}
                        >
                          {selectedAddress === addr.codlugar && (
                            <div className="animate-in zoom-in h-2.5 w-2.5 rounded-full bg-white duration-200"></div>
                          )}
                        </div>
                      </div>

                      {/* Address Info */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <MapPin
                            className={`h-4 w-4 ${selectedAddress === addr.codlugar ? 'text-blue-600' : 'text-gray-400'}`}
                          />
                          <h4
                            className={`text-[12px] font-bold uppercase ${selectedAddress === addr.codlugar ? 'text-blue-900' : 'text-gray-800'}`}
                          >
                            {addr.distrito}
                          </h4>
                        </div>
                        <p
                          className={`text-[12px] leading-relaxed ${selectedAddress === addr.codlugar ? 'text-blue-800' : 'text-gray-600'}`}
                        >
                          {addr.direccion}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Eliminar dirección:', addr.codlugar);
                        }}
                        className="flex-shrink-0 rounded-xl p-2.5 opacity-0 transition-all duration-200 hover:bg-red-100 group-hover:opacity-100"
                        title="Eliminar dirección"
                      >
                        <Trash2 className="h-5 w-5 text-red-500 hover:text-red-600" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer with gradient */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-slate-50"></div>
              <div className="relative flex items-center justify-between gap-3 border-t-2 border-blue-100 p-6">
                <button
                  onClick={() => {
                    console.log('Agregar nueva dirección');
                  }}
                  className="flex items-center gap-2 rounded-xl border-2 border-blue-500 bg-white px-5 py-2.5 font-semibold text-blue-600 shadow-sm transition-all duration-200 hover:bg-blue-500 hover:text-white hover:shadow-md active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Dirección
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="rounded-xl bg-gray-200 px-6 py-2.5 font-semibold text-gray-700  transition-all duration-200 hover:bg-gray-300 hover:shadow-md active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (selectedAddress && direcciones) {
                        const direccionSeleccionada = direcciones.find(
                          (d) => d.codlugar === selectedAddress
                        );
                        console.log('Dirección seleccionada:', direccionSeleccionada);
                        onClose();
                      }
                    }}
                    disabled={!selectedAddress}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 font-semibold text-white transition-all duration-200 hover:from-blue-700 hover:to-blue-800  disabled:cursor-not-allowed"
                  >
                    Guardar Selección
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalDireccion;