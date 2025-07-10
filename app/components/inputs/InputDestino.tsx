// components/InputDestino.tsx

import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { FiAlertTriangle } from 'react-icons/fi';
import { IDestino } from './IDestino';

interface InputDestinoProps {
  onSelectDestino: (destino: IDestino) => void;
}

export default function InputDestino({ onSelectDestino }: InputDestinoProps) {
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState<IDestino[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionado, setSeleccionado] = useState(false);

  useEffect(() => {
    const fetchDestinos = async () => {
      if (busqueda.trim().length < 1) {
        setSugerencias([]);
        return;
      }

      try {
        const response = await axios.get(
          `https://velsat.pe:2096/api/Preplan/GetDestinos?palabra=${busqueda}`
        );

        const resultados = Array.isArray(response.data)
          ? response.data
              .filter((item: any) => item.apepate)
              .map((item: any) => ({
                codigo: item.codigo,
                codlan: item.codlan,
                apepate: item.apepate,
                lugar: {
                  codlugar: item.lugar?.codlugar ?? 0,
                  direccion: item.lugar?.direccion ?? '',
                  distrito: item.lugar?.distrito ?? '',
                  wy: item.lugar?.wy ?? '',
                  wx: item.lugar?.wx ?? '',
                },
              }))
          : [];

        setSugerencias(resultados);
      } catch (error) {
        console.error('Error al obtener destinos:', error);
        setSugerencias([]);
        setMostrarSugerencias(true);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchDestinos();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [busqueda, seleccionado]);

  const seleccionarDestino = (destino: IDestino) => {
    setBusqueda(destino.apepate);
    setSugerencias([]);
    setMostrarSugerencias(false);
    setSeleccionado(true);
    onSelectDestino(destino);
  };

  return (
    <div className="relative">
      <input
        id="inputDestino"
        type="text"
        className="w-full rounded-md border border-gray-300 bg-gray-100 p-1.5 ps-8 text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0 dark:placeholder:text-gray-700"
        placeholder="Destino"
        value={busqueda}
        onChange={(e) => {
          if (seleccionado) {
            setSeleccionado(false);
            return;
          }
          setBusqueda(e.target.value);
          setMostrarSugerencias(true);
        }}
        onFocus={() => {
          if (sugerencias.length > 0 && !seleccionado)
            setMostrarSugerencias(true);
        }}
        onBlur={() => setTimeout(() => setMostrarSugerencias(false), 100)}
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2">
        <FaMapMarkerAlt color="#343a40" />
      </div>
      {mostrarSugerencias && (
        <ul className="fixed z-[9999] mt-1 max-h-60 w-[400px] overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
          {sugerencias.length > 0 ? (
            sugerencias.map((item, index) => (
              <li
                key={index}
                className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  seleccionarDestino(item);

                  setTimeout(() => {
                    const input = document.getElementById('inputDestino');
                    input?.blur();
                  }, 100);
                }}
              >
                {item.apepate}
              </li>
            ))
          ) : (
            <li className="flex items-center gap-2 px-4 py-2 text-red-700 text-[12px]">
              <FiAlertTriangle />
              No se encontró ningún destino
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
