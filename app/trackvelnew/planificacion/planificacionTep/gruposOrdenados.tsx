'use client'

import { useEffect, useState } from 'react';
import { obtenerDatosYAgrupar } from './fomarGrupos/apiService';

const Home = () => {
  const [grupos, setGrupos] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const groupedData = await obtenerDatosYAgrupar();
      setGrupos(groupedData);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Grupos de Servicios</h1>
      <select>
        <option value="">Seleccione Servicio</option>
        {grupos.map((grupo, index) => (
          <option key={index} value={`${grupo.fecha}-${grupo.tipo}`}>
            {grupo.empresa} {grupo.tipo} {grupo.fecha}
          </option>
        ))}
      </select>
      <div>
        {grupos.map((grupo, index) => (
          <div key={index}>
            <h2>Grupo {grupo.id}</h2>
            <p>Fecha: {grupo.fecha}</p>
            <p>Tipo: {grupo.tipo}</p>
            <p>Destino: {grupo.destino.nomdestino}</p>
            <ul>
              {grupo.personas.map((persona: any, idx: number) => (
                <li key={idx}>{persona.nombre} - {persona.direccion}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
