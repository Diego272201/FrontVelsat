'use client'
import React, { useEffect, useState } from 'react';
import { GoSignOut } from "react-icons/go";
import { CiLogout } from "react-icons/ci";

import '@/app/styles/turnos.css';
import TablaTurno from './TablaTurno';
import axios from 'axios';
export default function Page() {
  const [ingresoData, setIngresoData] = useState<any[]>([]);
  const [salidaData, setSalidaData] = useState<any[]>([]);

  useEffect(() => {
    axios
      .get('http://66.240.210.125:8586/api/Turnos/movilbus')
      .then((response) => {
        const data = response.data.map((item: any, index: number) => ({
          id: index + 1,
          n: index + 1,
          empresa: item.empresa,
          area: item.area,
          subarea: item.subarea,
          rol: item.codrl, // Mapeo de "codrl" a "rol"
          hora: item.hora,
          tipo: item.tipo,
          programacion: item.programa,
        }));

        // Filtrar los datos de ingreso y salida
        setIngresoData(data.filter((item:any) => item.tipo === 'I'));
        setSalidaData(data.filter((item:any) => item.tipo === 'S'));
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }, []);


  return (
    <div className="contenetTurnos">
      <div className="ingreso">
        <h2 className='tituloTunos'>Turnos de Ingreso
        </h2>
        <TablaTurno users={ingresoData} title="Ingreso"></TablaTurno>
      </div>
      <div className="salida">
      <h2 className='tituloTunos'>Turnos de Salida 

      </h2>
      <TablaTurno users={salidaData}  title="Salida"></TablaTurno>
      </div>
    </div>
  );
}
