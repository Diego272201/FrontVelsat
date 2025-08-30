import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, Loader2 } from 'lucide-react';

interface Pasajero {
  codigo: string;
  nombre: string | null;
  codlan: string;
  apepate: string;
  login: string | null;
  clave: string | null;
  sexo: string | null;
  telefono: string | null;
  empresa: string | null;
  lugar: {
    codlugar: number;
    codcli: string | null;
    direccion: string;
    distrito: string;
    wy: string;
    wx: string;
    estado: string | null;
    codcliente: string | null;
    referencia: string | null;
    zona: string;
  };
  servicioactual: any;
}

interface PasajeroAutocompleteInputProps {
  placeholder?: string;
  onSelectPasajero: (pasajero: Pasajero) => void;
  onManualInput?: (input: string) => void;
  className?: string;
  showSearchIcon?: boolean;
  allowManualEntry?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'nextui';
}

const PasajeroAutocompleteInput: React.FC<PasajeroAutocompleteInputProps> = ({
  placeholder = "Buscar pasajero (mín. 3 caracteres)...",
  onSelectPasajero,
  onManualInput,
  className = "",
  showSearchIcon = true,
  allowManualEntry = true,
  size = 'md',
  variant = 'default'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Pasajero[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Función para buscar pasajeros usando la API
  const searchPasajeros = async (palabra: string) => {
    if (palabra.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const url = `https://velsat.pe:2096/api/Preplan/GetPasajeros?palabra=${encodeURIComponent(palabra)}&codusuario=cgacela`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: Pasajero[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Error al buscar pasajeros:', err);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounce para la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue) {
        searchPasajeros(inputValue);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSelectPasajero = (pasajero: Pasajero) => {
    onSelectPasajero(pasajero);
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && allowManualEntry && inputValue.trim()) {
      if (onManualInput) {
        onManualInput(inputValue.trim());
      }
      setInputValue('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const clearInput = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Estilos base según el tamaño
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  // Estilos según variante
  const inputClasses = variant === 'nextui' 
    ? `w-full rounded-lg border border-gray-300 transition-colors focus:border-blue-500 focus:outline-none ${sizeClasses[size]} ${className}`
    : `w-full rounded-lg border border-slate-300 transition-colors focus:border-blue-500 focus:outline-none ${sizeClasses[size]} ${className}`;

  return (
    <div className={`relative ${className}`} ref={autocompleteRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          className={inputClasses}
          placeholder={placeholder}
        />
        
        {/* Iconos */}
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
          {showSearchIcon && !loading && (
            <Search className="h-4 w-4 text-slate-400" />
          )}
          {inputValue && (
            <button
              onClick={clearInput}
              className="h-4 w-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown de sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((pasajero) => (
            <div
              key={pasajero.codlan}
              onClick={() => handleSelectPasajero(pasajero)}
              className="cursor-pointer border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {pasajero.apepate}
                  </div>
                  <div className="text-xs text-slate-500">
                    Código: {pasajero.codlan} • {pasajero.lugar.distrito}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {pasajero.lugar.direccion}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mensaje cuando no hay sugerencias pero hay input */}
      {showSuggestions && suggestions.length === 0 && !loading && inputValue.length >= 3 && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg p-3">
          <div className="text-center text-sm text-slate-500">
            No se encontraron pasajeros con &quot;{inputValue}&quot;
            {allowManualEntry && (
              <div className="text-xs text-slate-400 mt-1">
                Presiona Enter para agregar manualmente
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PasajeroAutocompleteInput;