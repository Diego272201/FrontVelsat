'use client'
import React, { useEffect, useState } from 'react';
import '@/app/styles/turnos.css';
import TablaTurno from './TablaTurno';
import axios from 'axios';

export default function Page() {
  const [ingresoData, setIngresoData] = useState<any[]>([]);
  const [salidaData, setSalidaData] = useState<any[]>([]);

  // Función para obtener los datos de la API
  const fetchData = async () => {
    try {
      const response = await axios.get('https://localhost:7223/api/Turnos/movilbus');
      const data = response.data.map((item: any) => ({
        codigo: item.codigo,
        empresa: item.empresa,
        area: item.area,
        subarea: item.subarea,
        rol: item.codrl, // Mapeo de "codrl" a "rol"
        hora: item.hora,
        tipo: item.tipo,
        programacion: item.programa,
      }));

      // Filtrar los datos de ingreso y salida
      const ingresoDataFiltrada = data.filter((item: any) => item.tipo === 'I');
      const salidaDataFiltrada = data.filter((item: any) => item.tipo === 'S');

      // Asignar el número "n" para ingreso y salida
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
    fetchData();
  }, []);

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
