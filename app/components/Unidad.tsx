import React, { useEffect, useState } from 'react';
import { CgMoreVerticalAlt } from 'react-icons/cg';
import { TbPointFilled } from 'react-icons/tb';
import '@/app/styles/unidad.css';
import Image from 'next/image';

interface UnidadProps {
  codigoUnidad: string;
  velocidad: number;
  latitud: number;
  longitud: number;
  onSelectUnit: (coords: { latitud: number; longitud: number }) => void;
  lastCheckedId: string | null;
  onCheckboxChange: (id: string) => void;
  username: string;
}

const Unidad: React.FC<UnidadProps> = ({
  codigoUnidad,
  velocidad,
  latitud,
  longitud,
  onSelectUnit,
  lastCheckedId,
  onCheckboxChange,
  username,
}) => {
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

    document
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });

    event.target.checked = checked;

    setIsChecked(checked);
    if (checked) {
      onCheckboxChange(codigoUnidad);
      onSelectUnit({ latitud, longitud });
    }
  };

  // Función para determinar el color basado en la velocidad
  const getColorBySpeed = (speed: number): string => {
    if (speed >= 0 && speed < 1) {
      return '#FF0000'; // Rojo
    } else if (speed >= 1 && speed <= 20) {
      return '#ffb703'; // Amarillo
    } else if (speed > 20 && speed <= 45) {
      return '#38b000'; // Verde
    } else {
      return '#0066FF'; // Azul
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
        <Image
          src={username === 'dguevara' ? '/dguevara.webp' : '/UnidadK.webp'}
          alt="carrito"
          width={'1000'}
          height={'1000'}
        />
      </div>

      <div className="codigo-carro">
        <p id="cod_unidad"> {codigoUnidad} </p>
      </div>

      <div className="velocidad-carro">
        <p id="cod_unidad">{velocidad.toFixed(0)} Km/h </p>
      </div>

      <div className="luz-carro">
        <TbPointFilled style={{ color: getColorBySpeed(velocidad) }} />
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