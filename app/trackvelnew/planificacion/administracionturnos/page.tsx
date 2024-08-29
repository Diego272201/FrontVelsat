'use client';
import React, { useEffect, useState } from 'react';
import '@/app/styles/turnos.css';
import TablaTurno from './TablaTurno';
import axios from 'axios';
import { useApi } from '@/context/ApiContext';

export default function Page() {
  const [ingresoData, setIngresoData] = useState<any[]>([]);
  const [salidaData, setSalidaData] = useState<any[]>([]);
  const { baseUrl } = useApi();

  // Mueve fetchData fuera de useEffect para que esté disponible en todo el componente
  const fetchData = async () => {
    if (!baseUrl) return; // No continuar si baseUrl no está disponible
    
    try {
      const response = await axios.get(`${baseUrl}/api/Turnos/movilbus`);
      console.log("La url es: " + `${baseUrl}`);

      const data = response.data.map((item: any) => ({
        codigo: item.codigo,
        empresa: item.empresa,
        area: item.area,
        subarea: item.subarea,
        rol: item.codrl, 
        hora: item.hora,
        tipo: item.tipo,
        programacion: item.programa,
      }));

      const ingresoDataFiltrada = data.filter((item: any) => item.tipo === 'I');
      const salidaDataFiltrada = data.filter((item: any) => item.tipo === 'S');

      const ingresoDataConNumeracion = ingresoDataFiltrada.map((item: any, index: number) => ({
        ...item,
        id: index + 1,
        n: index + 1,
      }));

      const salidaDataConNumeracion = salidaDataFiltrada.map((item: any, index: number) => ({
        ...item,
        id: index + 1,
        n: index + 1,
      }));

      setIngresoData(ingresoDataConNumeracion);
      setSalidaData(salidaDataConNumeracion);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData(); // Llama a fetchData cuando baseUrl esté listo
  }, [baseUrl]); // Dependencia en baseUrl

  const handleSaveSuccess = () => {
    fetchData(); // Actualizar los datos
  };

  return (
    <div className="contenetTurnos">
      <div className="ingreso">
        <h2 className='tituloTunos'>Turnos de Ingreso</h2>
        <TablaTurno users={ingresoData} title="Ingreso" onSaveSuccess={handleSaveSuccess} onEditSuccess={handleSaveSuccess}/>
      </div>
      <div className="salida">
        <h2 className='tituloTunos'>Turnos de Salida</h2>
        <TablaTurno users={salidaData} title="Salida" onSaveSuccess={handleSaveSuccess} onEditSuccess={handleSaveSuccess}/>
      </div>
    </div>
  );
}
