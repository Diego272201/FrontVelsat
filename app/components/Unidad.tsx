import React, { useEffect, useState } from 'react';
import { CgMoreVerticalAlt } from 'react-icons/cg';
import { TbPointFilled } from 'react-icons/tb';
import '@/app/styles/unidad.css';

interface UnidadProps {
  codigoUnidad: string;
  velocidad: number;
  latitud: number;
  longitud: number;
  onSelectUnit: (coords: { latitud: number, longitud: number }) => void;
  lastCheckedId: string | null;
  onCheckboxChange: (id: string) => void;
}

const Unidad: React.FC<UnidadProps> = ({ codigoUnidad, velocidad, latitud, longitud, onSelectUnit, lastCheckedId, onCheckboxChange }) => {
  const [isChecked, setIsChecked] = useState(false); 

  useEffect(() => {
    if (codigoUnidad === lastCheckedId) {
      setIsChecked(true);
    } else {
      setIsChecked(false);
    }
  }, [codigoUnidad, lastCheckedId]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;

    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = false;
    });

    event.target.checked = checked;

    setIsChecked(checked);
    if (checked) {
      onCheckboxChange(codigoUnidad);
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
        <p id="cod_unidad">{velocidad.toFixed(0)} Km/h </p>
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
