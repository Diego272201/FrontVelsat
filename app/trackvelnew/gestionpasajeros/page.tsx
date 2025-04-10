'use client';
import React, { useEffect, useMemo, useState } from 'react';
import ModalPasajeros from './ModalPasajeros';
import { BiEditAlt, BiTrash } from 'react-icons/bi';
import axios from 'axios';
import { debounce } from 'lodash';
import ModalPasajerosEdit from './ModalPasajerosEdit';

interface Pasajero {
  codcliente: number;
  apellidos: string;
}

export default function Page() {
  const [pasajeros, setPasajeros] = useState<
    { value: number; label: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCodCliente, setSelectedCodCliente] = useState<number | null>(
    null,
  );
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const fetchPasajeros = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Pasajero[]>(
          'http://66.240.210.125:8586/api/Pasajero',
        );
        const data = response.data.map((pasajero) => ({
          value: pasajero.codcliente,
          label: pasajero.apellidos,
        }));
        setPasajeros(data);
        setLoading(false);
      } catch (error) {
        console.error('Error al obtener los pasajeros:', error);
        setLoading(false);
      }
    };

    fetchPasajeros();
  }, []);

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
      setInputValue(selectedPasajero.label); // Mostrar en el input
      setQuery(''); // Oculta el dropdown
      setSelectedCodCliente(selectedPasajero.value);
      console.log('Apellido:', selectedPasajero.label);
      console.log('CodCliente:', selectedPasajero.value);
    }
  };

  return (
    <div className="m-4 space-y-10 bg-gray-200 shadow-md">
      {/* Título principal */}
      <div className="flex justify-center bg-gray-50 p-4">
        <h2 className="text-lg font-bold text-gray-800">
          GESTIÓN DE PASAJEROS
        </h2>
      </div>
      {/* Buscador por nombre */}

      <div className="space-y-4 px-4">
        <div className="flex items-center gap-2 ">
          <h3 className="text-lg font-semibold text-gray-700">
            Búsqueda por Nombre
          </h3>
        </div>

        {/* Contenedor de input + botones */}
        <div className="flex w-full gap-4">
          {/* Input - 50% */}
          <div className="w-1/2">
            <div className="relative w-full">
              <input
                id="busqueda"
                type="text"
                placeholder="Buscar Pasajero"
                className="w-full rounded-md border bg-white p-2 ps-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
                onChange={(e) => {
                  setInputValue(e.target.value);
                  handleSearchChange(e.target.value);
                }}
                value={inputValue}
              />

              {query.length >= 2 && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredPasajeros.length > 0 ? (
                    filteredPasajeros.map((pasajero) => (
                      <li
                        key={pasajero.value}
                        onClick={() => handleSelectionChange(pasajero.value)}
                        className="cursor-pointer px-4 py-2 hover:bg-green-100"
                      >
                        {pasajero.label}
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-2 text-sm text-gray-500">
                      No se encontraron pasajeros
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Botones - 50% */}
          <div className="flex w-1/2 justify-end gap-2">
            <ModalPasajeros title="Nuevo Pasajero" />
            <ModalPasajerosEdit
              title="Detalle Pasajero"
              codCliente={selectedCodCliente}
            />
            <button className="inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-red-600">
              <BiTrash className="text-white" size={18} />
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Búsqueda por código */}
      <div className="space-y-4 px-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-700">
            Búsqueda por Código
          </h3>
        </div>

        {/* Input 70% + Botón 30% */}
        <div className="flex w-full gap-4">
          <input
            type="text"
            placeholder="Ingrese Código"
            className="flex-[0.7] rounded-md border bg-white p-2 ps-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-0"
          />
          <button className="inline-flex flex-[0.3] items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-blue-600">
            <BiEditAlt className="text-white" size={18} />
            Editar
          </button>
        </div>
      </div>

      {/* Carga Masiva */}
      <div className="space-y-4 px-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-700">Carga Masiva</h3>
        </div>
        <form className="flex flex-col items-start gap-3">
          <label
            htmlFor="file-input"
            className="w-full cursor-pointer rounded-lg border border-dashed border-gray-400 bg-gray-50 p-6 text-center hover:bg-gray-100"
          >
            <span className="block font-medium text-gray-600">
              Suelte los archivos aquí
            </span>
            <span className="text-sm text-gray-400">
              o haga clic para seleccionar
            </span>
            <input type="file" id="file-input" className="hidden" />
          </label>
          <button
            type="submit"
            className="mb-4 mt-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Cargar
          </button>
        </form>
      </div>
    </div>
  );
}
