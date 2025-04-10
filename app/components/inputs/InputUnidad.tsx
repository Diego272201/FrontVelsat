import React, { useEffect, useState } from 'react';
import { FaCar } from 'react-icons/fa';
import axios from 'axios';
import { API_UNIDADES } from '../urlsApi/urlApi';

interface Unidad {
  id: number;
  codunidad: string;
}

interface InputUnidadProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (codunidad: string) => void;
}

const InputUnidad: React.FC<InputUnidadProps> = ({ value, onChange, onSelect }) => {


  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [filtered, setFiltered] = useState<Unidad[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    axios.get(API_UNIDADES)
      .then(res => setUnidades(res.data))
      .catch(err => console.error('Error al obtener unidades:', err));
  }, []);

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
    <div className="relative">
      <input
        type="text"
        className="peer block w-96 rounded-lg border-transparent bg-gray-100 px-4 py-2 ps-11 text-sm placeholder-zinc-500"
        placeholder="Unidad"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
        <FaCar color="#343a40" />
      </div>
      {showDropdown && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-lg">
          {filtered.map((u) => (
            <li
              key={u.id}
              className="cursor-pointer px-4 py-2 hover:bg-gray-200"
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
