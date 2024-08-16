import React from 'react';
import { GoSignOut } from "react-icons/go";
import { CiLogout } from "react-icons/ci";

import '@/app/styles/turnos.css';
import TablaTurno from './TablaTurno';
export default function Page() {
  return (
    <div className="contenetTurnos">
      <div className="ingreso">
        <h2 className='tituloTunos'>Turnos de Ingreso
        </h2>
        <TablaTurno></TablaTurno>
      </div>
      <div className="salida">
      <h2 className='tituloTunos'>Turnos de Salida 

      </h2>
      <TablaTurno></TablaTurno>
      </div>
    </div>
  );
}
