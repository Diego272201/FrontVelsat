import React, { useState } from 'react';
import { CgMoreVerticalAlt } from 'react-icons/cg';
import { TbPointFilled } from 'react-icons/tb';
import '@/app/styles/unidad.css';

interface UnidadProps {
  codigoUnidad: string;
  velocidad: number;
  latitud: number;
  longitud: number;
  onSelectUnit: (coords: { latitud: number, longitud: number }) => void;
}

const Unidad: React.FC<UnidadProps> = ({ codigoUnidad, velocidad, latitud, longitud, onSelectUnit }) => {
  const [isChecked, setIsChecked] = useState(false); 

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;


    if (checked && document.querySelectorAll('input[type="checkbox"]:checked').length > 1) {
      event.preventDefault(); 
      return;
    }

    setIsChecked(checked);
    if (checked) {
      onSelectUnit({ latitud, longitud });
    }
  };

  return (
    <div className="lista-carros">
      <div className="checkStyle">
        <div className="checkbox-wrapper-13">
          <input
            type="checkbox"
            id="c1-13"
            checked={isChecked}
            onChange={handleCheckboxChange}
          />
        </div>
      </div>

      <div className="img-listacarro">
        <img src="/list-car.png" alt="carrito" />
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
};

export default Unidad;