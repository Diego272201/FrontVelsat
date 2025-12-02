import React, { useState } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import '@/app/styles/leyendaservicios.css';

import { parseFecha } from './dates/convertToCustomFormat ';
import { MdMenuBook } from 'react-icons/md';

interface Leyenda {
  unidad: string;
  fechaIni: string;
  fechaFin: string;
}

export default function Leyenda({ unidad, fechaIni, fechaFin }: Leyenda) {
  const [showDropdown, setShowDropdown] = useState(true);
  const fechaIniHora = parseFecha(fechaIni);
  const fechaFinHora = parseFecha(fechaFin);

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
      <div className="desplegable" style={{ width: '250px' }}>
        <label
          className="previos"
          htmlFor="muestra"
          id="label-muestra"
          title="Despliega Menu"
        >
          <div className="nombreP bg-[#1d4ed8]">
            <GrFormNext size={25} />
          </div>
        </label>

        <label
          className="previos"
          htmlFor="oculta"
          id="label-oculta"
          title="Oculta Menu"
        >
          <div className="nombreP bg-blue-700">
            {' '}
            <GrFormPrevious size={25} />
          </div>
        </label>

        <div>
          <div className="flex items-center justify-center gap-2 bg-blue-700 p-2 text-[13px] font-bold text-white">
            LEYENDA <MdMenuBook size={18} />
          </div>
          <div className="max-w-xs space-y-4 border-b-2  border-r-2  border-t-2 border-[#ced4da]  bg-[#f8f9fa] p-4 text-sm text-[#212529]">
            <div>
              <h2 className="border-b border-[#dee2e6]/100 pb-1 font-sans text-[12px] font-bold uppercase tracking-wide">
                Unidad
              </h2>
              <p className="text-[12px] uppercase">{unidad}</p>
            </div>

            <div>
              <h2 className="border-b border-[#dee2e6]/100 pb-1 font-sans text-[12px] font-bold uppercase tracking-wide">
                RANGO FECHAS
              </h2>
              <p className="text-[12px]">
                {fechaIniHora} - {fechaFinHora}
              </p>
            </div>

            <div className="text-[12.5px]">
              <h2 className="border-b border-[#dee2e6]/100 pb-1 font-sans text-[12px] font-bold uppercase tracking-wide">
                RANGO VELOCIDAD
              </h2>

              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-red-500" />
                  <span className="text-[12px]">0 km/h</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-yellow-500" />
                  <span className="text-[12px]">1 - 10 km/h</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-green-400" />
                  <span className="text-[12px]">11 - 59 km/h</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-blue-400" />
                  <span className="text-[12px]">&gt; 60 km/h</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
