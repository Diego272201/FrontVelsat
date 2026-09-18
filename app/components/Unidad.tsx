import React, { useEffect, useState } from 'react';
import { TbPointFilled } from 'react-icons/tb';
import '@/app/styles/unidad.css';
import Image from 'next/image';

interface UnidadProps {
  codigoUnidad: string;
  velocidad: number;
  latitud: number;
  longitud: number;
  onSelectUnit: (
    coords: { latitud: number; longitud: number },
    deviceId?: string,
  ) => void;
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
      onSelectUnit({ latitud, longitud }, codigoUnidad);
    }
  };

  // Función para determinar el color basado en la velocidad
  const getColorBySpeed = (speed: number): string => {
    if (speed >= 0 && speed < 1) {
      return '#FF0000'; // Rojo
    } else if (speed >= 1 && speed <= 20) {
      return '#f69300ff'; // Amarillo
    } else if (speed > 20 && speed <= 45) {
      return '#319602ff'; // Verde
    } else {
      return '#0066FF'; // Azul
    }
  };

  const getSpeedTooltip = (speed: number): string => {
    if (speed < 1) return 'Detenido (0 Km/h)';
    if (speed <= 20) return `Velocidad baja (${speed.toFixed(0)} Km/h)`;
    if (speed <= 45) return `En ruta (${speed.toFixed(0)} Km/h)`;
    return `Exceso de velocidad (${speed.toFixed(0)} Km/h)`;
  };

  return (
    <div
      className={`lista-carros ${isChecked ? 'lista-carro-activa' : ''}`}
      onClick={() => {
        onCheckboxChange(codigoUnidad);
        onSelectUnit({ latitud, longitud }, codigoUnidad);
      }}
      title={`Clic para centrar ${codigoUnidad}`}
    >
      <div className="checkStyle" onClick={(e) => e.stopPropagation()}>
        <div className="checkbox-wrapper-13">
          <input
            type="checkbox"
            id={`chk-${codigoUnidad}`}
            checked={isChecked}
            onChange={handleCheckboxChange}
          />
        </div>
      </div>

      <div className="img-listacarro">
        <Image
          src={username === 'dguevara' ? '/dguevara.webp' : '/UnidadK.webp'}
          alt="carrito"
          width={55}
          height={30}
          className="object-contain"
        />
      </div>

      <div className="codigo-carro">
        <span id="cod_unidad">{codigoUnidad}</span>
      </div>

      <div className="velocidad-carro">
        <span id="cod_unidad">{velocidad.toFixed(0)} Km/h</span>
      </div>

      <div className="luz-carro" title={getSpeedTooltip(velocidad)}>
        <TbPointFilled style={{ color: getColorBySpeed(velocidad) }} size={19} />
      </div>
    </div>
  );
};

export default Unidad;