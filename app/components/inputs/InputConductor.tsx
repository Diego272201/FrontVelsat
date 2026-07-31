import React, { useEffect, useState } from 'react';
import { FaUserTie } from 'react-icons/fa6';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { getApiConductoresUrl } from '../urlsApi/urlApi';

interface Conductor {
  codigo: number;
  apepate: string;
}

interface InputConductorProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (codigo: number, apepate: string) => void;
  bgColor?: 'gray-100' | 'gray-200' | 'white'; 
  heightClass?: string;
}

const InputConductor: React.FC<InputConductorProps> = ({
  value,
  onChange,
  onSelect,
  bgColor = 'gray-100',
  heightClass = 'h-8',
}) => {
  const { data: session } = useSession();
  const username = session?.user.username;

  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [filtered, setFiltered] = useState<Conductor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (username) {
      axios
        .get(getApiConductoresUrl(username))
        .then((res) => setConductores(res.data))
        .catch((err) => console.error('Error al obtener conductores:', err));
    } else {
      console.warn('Username no disponible');
    }
  }, [username]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (val.trim() === '') {
      setFiltered([]);
      setShowDropdown(false);

      onSelect?.(0, '');

      return;
    }

    const result = conductores.filter((c) =>
      c.apepate.toLowerCase().includes(val.toLowerCase()),
    );
    setFiltered(result);
    setShowDropdown(result.length > 0);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        className={`w-full ${heightClass} rounded-md border border-gray-200 bg-${bgColor} pl-7 pr-2 text-[11px] placeholder-gray-400 focus:border-brandPrimary focus:outline-none`}
        placeholder="Conductor"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
        <FaUserTie className="h-3.5 w-3.5 text-gray-400" />
      </div>
      {showDropdown && filtered.length > 0 && (
        <ul className="fixed z-[9999] mt-1 max-h-60 w-96 overflow-y-auto rounded-lg border border-gray-300 bg-white text-[11px] shadow-lg">
          {filtered.map((c) => (
            <li
              key={c.codigo}
              className="cursor-pointer px-3 py-1.5 hover:bg-blue-50"
              onClick={() => onSelect?.(c.codigo, c.apepate)}
            >
              {c.apepate}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InputConductor;
