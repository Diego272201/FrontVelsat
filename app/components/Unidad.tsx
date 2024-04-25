'use client';

import React from 'react';
import { CgMoreVerticalAlt } from 'react-icons/cg';
import { TbPointFilled } from 'react-icons/tb';
import '@/app/styles/unidad.css';

interface UnidadProps{
  codigoUnidad: string;
  velocidad: number
}

const  Unidad: React.FC<UnidadProps> = (props) => {
  const { codigoUnidad, velocidad } = props
  return (
    <div className="lista-carros">

      <div className="checkStyle">

        <div className="checkbox-wrapper-13">
          <input type="checkbox" id="c1-13"/>
        </div>
        
      </div>

      <div className="img-listacarro">
        <img src="./list-car.png" alt="carrito" />
      </div>

      <div className="codigo-carro">
        <p id="cod_unidad"> {codigoUnidad} </p>
      </div>

      <div className="velocidad-carro">
        <p id="cod_unidad">{velocidad} Km/h </p>
      </div>

      <div className="luz-carro">
        <TbPointFilled />
      </div>

      <div className="detalles-carro">
        <a href="#">
          <CgMoreVerticalAlt size={30} />
        </a>
      </div>
    </div>
  );
}
export default Unidad;