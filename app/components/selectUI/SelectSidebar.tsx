import { useState } from 'react';
import { MapPin, Truck, Home } from 'lucide-react';

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
    onRutaChange(value);
  };

  return (
    <div className="mx-auto mt-1">
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Seleccionar Ruta
      </label>
      <div className="relative">
        {/* Icono con lucide-react */}
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>

        <select
          value={selected}
          onChange={handleChange}
          className="w-full appearance-none border  border-gray-300 bg-white py-2 pl-10 pr-5 text-sm capitalize text-gray-900 shadow-sm transition-all duration-200 ease-in-out hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option
            value=""
            disabled
            className="bg-gray-500 font-medium text-gray-50"
          >
            Seleccione una ruta
          </option>

          {options.map((opt, index) => (
            <option
              key={opt}
              value={opt}
              className={`px-1 py-2 hover:bg-blue-50  ${
                opt === 'Todas'
                  ? 'bg-blue-50 font-semibold  text-blue-600'
                  : 'text-gray-700'
              }`}
            >
              {opt === 'Todas' ? 'TODAS LAS RUTAS' : `${opt}`}
            </option>
          ))}
        </select>

        {/* Icono de flecha con lucide-react */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="h-4 w-4 text-gray-400 transition-colors duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
