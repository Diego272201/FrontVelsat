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
  bgColor?: 'gray-100' | 'gray-200' | 'white'; 

  padding?: string;
  usuario: string; // Nuevo prop requerido
}

const InputUnidad: React.FC<InputUnidadProps> = ({ 
  value, 
  onChange, 
  onSelect, 
  bgColor = 'gray-50', 
  padding = 'p-2',
  usuario // Nuevo prop
}) => {

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [filtered, setFiltered] = useState<Unidad[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    axios.get(getApiUnidadesUrl(usuario)) // Usar la función con el parámetro usuario
      .then(res => setUnidades(res.data))
      .catch(err => console.error('Error al obtener unidades:', err));
  }, [usuario]); // Agregar usuario como dependencia

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
        className={`w-full border rounded border-gray-300 bg-${bgColor} ${padding} ps-11 text-[11px] placeholder-zinc-500 focus:border-blue-400 focus:outline-none focus:ring-0`} 
        placeholder="Unidad"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
        <FaCar className='text-gray-400' />
      </div>
      {showDropdown && filtered.length > 0 && (
        <ul className="fixed z-[9999] mt-1 max-h-60 w-[200px] overflow-y-auto rounded-lg border border-gray-300 bg-white text-[12px] shadow-lg">
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