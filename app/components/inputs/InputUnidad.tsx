import React, { useEffect, useState } from 'react';
import { FaCar } from 'react-icons/fa';
import axios from 'axios';
import { getApiUnidadesUrl } from '../urlsApi/urlApi';

interface Unidad {
  id: number;
  codunidad: string;
}

interface InputUnidadProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (codunidad: string) => void;
  bgColor?: string; 
  padding?: string;
  heightClass?: string;
  usuario: string;
}

const InputUnidad: React.FC<InputUnidadProps> = ({ 
  value, 
  onChange, 
  onSelect, 
  bgColor = 'white', 
  heightClass = 'h-8',
  usuario 
}) => {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [filtered, setFiltered] = useState<Unidad[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    axios.get(getApiUnidadesUrl(usuario))
      .then(res => setUnidades(res.data))
      .catch(err => console.error('Error al obtener unidades:', err));
  }, [usuario]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
  
    if (val.trim() === '') {
      setFiltered([]);
      setShowDropdown(false);
      onSelect?.('');
      return;
    }
    
    const result = unidades.filter(u =>
      (u.codunidad ?? '').toLowerCase().includes(val.toLowerCase())
    );
    setFiltered(result);
    setShowDropdown(result.length > 0);
  };
  
  return (
    <div className="relative w-full">
      <input
        type="text"
        className={`w-full ${heightClass} rounded-md border border-gray-200 bg-${bgColor} pl-7 pr-2 text-[11px] placeholder-gray-400 focus:border-[#113EB9] focus:outline-none`} 
        placeholder="Unidad"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
        <FaCar className="h-3.5 w-3.5 text-gray-400" />
      </div>
      {showDropdown && filtered.length > 0 && (
        <ul className="fixed z-[9999] mt-1 max-h-60 w-[200px] overflow-y-auto rounded-lg border border-gray-300 bg-white text-[11px] shadow-lg">
          {filtered.map((u) => (
            <li
              key={u.id}
              className="cursor-pointer px-3 py-1.5 hover:bg-blue-50"
              onClick={() => onSelect?.(u.codunidad)}
            >
              {u.codunidad}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InputUnidad;