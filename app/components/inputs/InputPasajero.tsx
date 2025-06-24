import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { FiAlertTriangle } from 'react-icons/fi';

interface IPasajero {
    apepate: string;
    codlan: string;
    codlugar: number;
  }

interface InputPasajeroProps {
    onSelectPasajero: (pasajero: IPasajero) => void;
    clearAfterSelect?: boolean; // Nueva prop opcional
  }

export default function InputPasajero({ 
  onSelectPasajero, 
  clearAfterSelect = false 
}: InputPasajeroProps) {
  const [pasajero, setPasajero] = useState('');
  const [sugerencias, setSugerencias] = useState<
    { apepate: string; codlan: string , codlugar:number}[]
  >([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionado, setSeleccionado] = useState(false);

  const [pasajeroCodlan, setPasajeroCodlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchPasajeros = async () => {
      if (pasajero.length < 1) {
        setSugerencias([]);
        return;
      }

      try {
        const response = await axios.get(
          `https://velsat.pe:8586/api/Preplan/GetPasajeros?palabra=${pasajero}`,
        );

        const resultados = Array.isArray(response.data)
        ? response.data.map((item: any) => ({
            apepate: item.apepate,
            codlan: item.codlan,
            codlugar: item.lugar?.codlugar ?? 0, 
          }))
        : [];
      

        setSugerencias(resultados);
      } catch (error) {
        console.error('Error al obtener pasajeros:', error);
        setSugerencias([]);
        setMostrarSugerencias(true);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchPasajeros();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [pasajero, seleccionado]);

  const seleccionarPasajero = (
    nombre: string,
    codlan: string,
    codlugar: number
  ) => {
    console.log('Pasajero seleccionado:', nombre, codlan, codlugar);
    const nuevoPasajero = { apepate: nombre, codlan, codlugar };
  
    // Si clearAfterSelect es true, limpia el input, sino mantiene el nombre
    if (clearAfterSelect) {
      setPasajero('');
      setSeleccionado(false);
    } else {
      setPasajero(nombre);
      setSeleccionado(true);
    }
    
    setPasajeroCodlan(codlan);
    setSugerencias([]);
    setMostrarSugerencias(false);
    onSelectPasajero(nuevoPasajero);
  };
  
  return (
    <div>
      <div className="relative">
        <input
          id="inputPasajero"
          type="text"
          className="w-full rounded-md border border-gray-300 bg-gray-200 p-1.5 ps-11 text-sm focus:border-gray-400 focus:outline-none focus:ring-0 dark:placeholder:text-gray-700"
          placeholder="Pasajero"
          value={pasajero}
          onChange={(e) => {
            if (seleccionado && !clearAfterSelect) {
              setSeleccionado(false);
              return;
            }
            setPasajero(e.target.value);
            setMostrarSugerencias(true);
          }}
          onFocus={() => {
            if (sugerencias.length > 0 && (!seleccionado || clearAfterSelect))
              setMostrarSugerencias(true);
          }}
          onBlur={() => setTimeout(() => setMostrarSugerencias(false), 100)}
        />
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
          <FaUser color="#343a40" />
        </div>
        {mostrarSugerencias && (
          <ul className="fixed z-[9999] mt-1 max-h-60  w-[400px] overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg ">
            {sugerencias.length > 0 ? (
              sugerencias.map((item, index) => (
                <li
                  key={index}
                  className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    seleccionarPasajero(item.apepate, item.codlan, item.codlugar);

                    setMostrarSugerencias(false);
                    setSugerencias([]);

                    // Solo hacer blur si no se va a limpiar automáticamente
                    if (!clearAfterSelect) {
                      setTimeout(() => {
                        const input = document.getElementById('inputPasajero');
                        input?.blur();
                      }, 100);
                    }
                  }}
                >
                  {item.apepate}
                </li>
              ))
            ) : (
              <li className="flex items-center gap-2 px-4 py-2 text-red-700">
                <FiAlertTriangle />
                No se encontró ningún pasajero
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}