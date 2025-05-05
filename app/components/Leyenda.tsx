import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import '@/app/styles/sidebar.css';

import { useSession } from 'next-auth/react';

import { useApi } from '@/context/ApiContext';

interface Leyenda {
    titulo: string;

}

export default function Leyenda() {
  const { data: session } = useSession();

  const [showDropdown, setShowDropdown] = useState(true);

  const { baseUrl } = useApi();

  const username = useMemo(() => {
    return localStorage.getItem('currentUser') || '';
  }, []);

  const showMenu = () => {
    setShowDropdown(true);
  };

  const hideMenu = () => {
    setShowDropdown(false);
  };

  return (
    <div className="sidebarScroll">
      <input
        type="radio"
        name="opcion"
        id="muestra"
        onClick={showMenu}
        defaultChecked={showDropdown}
      />
      <input
        type="radio"
        name="opcion"
        id="oculta"
        onClick={hideMenu}
        defaultChecked={!showDropdown}
      />

      <div className="desplegable">
        <label
          className="previos"
          htmlFor="muestra"
          id="label-muestra"
          title="Despliega Menu"
        >
          <div className="nombreP">
            <GrFormNext size={25} />
          </div>
        </label>

        <label
          className="previos"
          htmlFor="oculta"
          id="label-oculta"
          title="Oculta Menu"
        >
          <div className="nombreP">
            {' '}
            <GrFormPrevious size={25} />
          </div>
        </label>

        <div className="">

          <div className="max-w-xs bg-[#113EB9] text-white  p-4 shadow-lg space-y-4 text-sm">
      {/* Detalles */}
      <div>
        <h2 className="text-lg font-bold border-b border-white/30 pb-1">Detalles</h2>
        <p><span className="font-semibold">Número:</span> 1</p>
        <p><span className="font-semibold">Tipo:</span> Salida</p>
        <p><span className="font-semibold">Unidad:</span> C174-ADT869</p>
        <p><span className="font-semibold">Empresa:</span> Talma</p>
        <p><span className="font-semibold">Fecha:</span> 04/05/2025</p>
      </div>

      {/* Rango de Horas */}
      <div>
        <h2 className="text-lg font-bold border-b border-white/30 pb-1">Rango Horas</h2>
        <p>11:58 AM - 13:25 PM</p>
      </div>

      {/* Leyenda */}
      <div>
        <h2 className="text-lg font-bold border-b border-white/30 pb-1">Leyenda</h2>
        <ul className="space-y-2 mt-2">
          <li className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
            <span>0 km/h</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white" />
            <span>1 - 10 km/h</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-green-400 border-2 border-white" />
            <span>11 - 59 km/h</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white" />
            <span>&gt; 60 km/h</span>
          </li>
        </ul>
      </div>
    </div>
        </div>
      </div>
    </div>
  );
}
