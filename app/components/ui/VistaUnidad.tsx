import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { SiPagespeedinsights } from 'react-icons/si';
import { MdShutterSpeed } from "react-icons/md";

interface Props {
  item: number;
  deviceId: string;
  kilometros: number;
}

export default function VistaUnidad({ item, deviceId, kilometros }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 } 
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div className="viewDevice" ref={ref}>
      <div className="imgDevice">
        <div className="itemChip">ITEM N° {item}</div>

        {isVisible && (
          <Image
            src="/UnidadK.webp"
            width={150}
            height={150}
            alt="Picture of the author"
            loading="lazy"
          />
        )}

        <div className="deviceOnly devicePadding">
          <SiPagespeedinsights />
          Unidad: {deviceId.toUpperCase()}
        </div>
      </div>
      <div className="border-l-2 mx-1 h-full"></div>


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
