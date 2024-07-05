import React from 'react';
import Image from 'next/image';
import { SiPagespeedinsights } from 'react-icons/si';
import { MdShutterSpeed } from "react-icons/md";
import { Chip } from '@nextui-org/react';

interface Props {
  item: number;
  deviceId: string;
  kilometros: number;
}

export default function VistaUnidad({item, deviceId, kilometros}: Props) {
  return (
    <div className="viewDevice">
      <div className="imgDevice">
      <div className="itemChip">ITEM N° {item}</div>

        <Image
          src="/UnidadK.webp"
          width={300}
          height={300}
          alt="Picture of the author"
        ></Image>

        <div className="deviceOnly devicePadding">
          <SiPagespeedinsights />
          Unidad: {deviceId}
        </div>
      </div>

      <div className="odometroDiv">
        <div className="odometer" id="odometer">
          <div className='kmp'>
          {kilometros} KM

          </div>
          <div className="deviceOnly deviceId">
          <MdShutterSpeed />
          KILOMETROS RECORRIDOS
        </div>
        </div>
      </div>
    </div>
  );
}
