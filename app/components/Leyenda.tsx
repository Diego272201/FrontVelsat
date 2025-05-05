import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import '@/app/styles/sidebar.css';

import { useSession } from 'next-auth/react';

import { useApi } from '@/context/ApiContext';

interface Leyenda {
    titulo: string;
    
}

export default function Leyenda() {
  const { data: session } = useSession();

  const [showDropdown, setShowDropdown] = useState(true);

  const { baseUrl } = useApi();

  const username = useMemo(() => {
    return localStorage.getItem('currentUser') || '';
  }, []);

  const showMenu = () => {
    setShowDropdown(true);
  };

  const hideMenu = () => {
    setShowDropdown(false);
  };

  return (
    <div className="sidebarScroll">
      <input
        type="radio"
        name="opcion"
        id="muestra"
        onClick={showMenu}
        defaultChecked={showDropdown}
      />
      <input
        type="radio"
        name="opcion"
        id="oculta"
        onClick={hideMenu}
        defaultChecked={!showDropdown}
      />

      <div className="desplegable">
        <label
          className="previos"
          htmlFor="muestra"
          id="label-muestra"
          title="Despliega Menu"
        >
          <div className="nombreP">
            <GrFormNext size={25} />
          </div>
        </label>

        <label
          className="previos"
          htmlFor="oculta"
          id="label-oculta"
          title="Oculta Menu"
        >
          <div className="nombreP">
            {' '}
            <GrFormPrevious size={25} />
          </div>
        </label>

        <div className="menu">
          <div className="unidades">TOTAL DE UNIDADES</div>
        </div>
      </div>
    </div>
  );
}
