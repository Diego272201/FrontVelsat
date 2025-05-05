import React, { useState } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import '@/app/styles/sidebar.css';

import {
  convertirFechaADDMMAAAA,
  obtenerHora12,
} from './dates/convertToCustomFormat ';
import { BsFillInfoSquareFill } from 'react-icons/bs';

interface Leyenda {
  numero: string;
  tipo: string;
  unidad: string;
  empresa: string;
  fecha: string;
  fechaIni: string;
  fechaFin: string;
}

export default function Leyenda({
  numero,
  tipo,
  unidad,
  empresa,
  fecha,
  fechaIni,
  fechaFin,
}: Leyenda) {
  const [showDropdown, setShowDropdown] = useState(true);

  const fechaConvertida = convertirFechaADDMMAAAA(fecha);
  const fechaIniHora = obtenerHora12(fechaIni);
  const fechaFinHora = obtenerHora12(fechaFin);

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
          <div className="nombreP bg-[#495057]">
            <GrFormNext size={25} />
          </div>
        </label>

        <label
          className="previos"
          htmlFor="oculta"
          id="label-oculta"
          title="Oculta Menu"
        >
          <div className="nombreP bg-[#113EB9]">
            {' '}
            <GrFormPrevious size={25} />
          </div>
        </label>

        <div className="">
          <div className="unidades bg-[#113EB9] flex gap-2">
            INFORMACIÓN DEL SERVICIO <BsFillInfoSquareFill size={18}/>
          </div>
          <div className="max-w-xs space-y-4 border-b-2  border-r-2  border-t-2 border-[#ced4da]  bg-[#f8f9fa] p-4 text-sm text-[#212529]">
            {/* Detalles */}
            <div className='text-[12.5px]'>
              <h2 className="border-b border-[#dee2e6]/100 pb-1 text-[13px] font-bold">
                DETALLES
              </h2>
              <p>
                <span className="font-semibold">Número de Servicio : </span>
                {numero}{' '}
              </p>
              <p>
                <span className="font-semibold">Tipo : </span>{' '}
                {tipo == 'S' ? 'Salida' : 'Ingreso'}
              </p>
              <p>
                <span className="font-semibold">Unidad : </span>
                {unidad.toUpperCase()}
              </p>
              <p>
                <span className="font-semibold">Empresa : </span> {empresa}
              </p>
              <p>
                <span className="font-semibold">Fecha : </span>{' '}
                {fechaConvertida}
              </p>
            </div>

            {/* Rango de Horas */}
            <div>
              <h2 className="border-b border-[#dee2e6]/100 pb-1 text-[13px] font-bold">
                RANGO HORAS
              </h2>
              <p className='text-[12.5px]'>
                {fechaIniHora} - {fechaFinHora}
              </p>
            </div>

            {/* Leyenda */}
            <div className='text-[12.5px]'>
              <h2 className="border-b border-[#dee2e6]/100 pb-1 text-[13px] font-bold">
                LEYENDA
              </h2>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-red-500" />
                  <span>0 km/h</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-yellow-500" />
                  <span>1 - 10 km/h</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-green-400" />
                  <span>11 - 59 km/h</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white bg-blue-400" />
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
