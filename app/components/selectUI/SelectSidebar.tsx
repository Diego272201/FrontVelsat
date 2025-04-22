// SelectSidebar.tsx
import { useState } from 'react';

const options = [
  'Todas',
  'SURTIDOR CONCRETO-2',
  'SURTIDOR 205 - ATOCONGO',
  'SURTIDOR EL SOL – GRUPO 1',
  'SURTIDOR 2 - MANCHAY',
  'CR 27 - MUSA - LA MOLINA',
  'SURTIDOR 06 - GRUPO 2 -SAN JUAN / CHORRILLOS',
  'SURTIDOR SAN BARTOLO',
  'SURTIDOR PUNTA HERMOSA',
  'SURTIDOR EL SOL',
  'SURTIDOR EL SOL – GRUPO 04',
];

export default function SelectSidebar({
  onRutaChange,
}: {
  onRutaChange: (ruta: string) => void;
}) {
  const [selected, setSelected] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelected(value);
    onRutaChange(value); // notifica al padre
  };

  return (
    <div className="mx-auto mt-1">
      <div className="relative text-sm text-gray-700">
        <select
          value={selected}
          onChange={handleChange}
          className="w-full appearance-none  border border-gray-300 bg-white p-2 focus:border-gray-400 focus:outline-none focus:ring-0"
        >
          <option value="" disabled>
            Seleccione Ruta
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
