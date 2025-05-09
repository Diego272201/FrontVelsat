'use client';

import { useEffect, useState } from 'react';
import { FaUsers } from 'react-icons/fa';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';


interface Leyenda {
    codigo: string;
}

interface Pasajero {
    id: number;
    codlan: string;
    apellidos: string;
}

export default function ServiceLegend({codigo}: Leyenda) {
  const [isOpen, setIsOpen] = useState(true);

  const [pasajeros, setPasajeros] = useState<Pasajero[]>([])
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!codigo) return;

    const fetchPasajeros = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://velsat.pe:8586/api/Recorrido/PasajerosServicio/${codigo}`);
        const data = await response.json();
        setPasajeros(data);
      } catch (error) {
        console.error('Error al obtener pasajeros:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPasajeros();
  }, [codigo]);

  return (
    <>
      <div
        className={`fixed right-0 top-[40px] z-50 flex h-full items-start transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full w-72 border-l border-gray-300 bg-white shadow-xl">
          <div className="relative flex items-center justify-between bg-blue-700 px-4 py-2 text-[12px] font-semibold text-white">
            LISTA DE PASAJEROS
            <FaUsers size={20} />
          </div>


          <div className="h-[calc(100%-40px)] overflow-y-auto p-4 space-y-2">
            {loading ? (
              <p className="text-center text-gray-500">Cargando...</p>
            ) : pasajeros.length === 0 ? (
              <p className="text-center text-gray-500">No hay pasajeros.</p>
            ) : (
              pasajeros.map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm">
                  <p className="text-[12px] font-semibold text-gray-800 uppercase">{p.id}. {p.apellidos}</p>
                  <p className="text-xs text-gray-500">CodLan: {p.codlan}</p>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="pasajerosleyenda absolute -left-6 top-1/2 flex h-24 w-6 -translate-y-1/2 items-center justify-center  bg-blue-700 text-white shadow-md transition hover:bg-blue-800"
            title="Ocultar"
            
          >
            <MdKeyboardArrowRight size={30} />
          </button>
        </div>
      </div>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="pasajerosleyenda fixed right-0 z-50 flex h-24 w-6 -translate-y-1/2  items-center justify-center bg-gray-600 text-white shadow-md transition hover:bg-blue-800"
          title="Mostrar"
          style={{ top: 'calc(50% + 40px)' }}

        >
          <MdKeyboardArrowLeft size={30} />
        </button>
      )}
    </>
  );
}
