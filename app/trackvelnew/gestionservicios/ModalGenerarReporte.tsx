import { Spinner } from '@nextui-org/react';
import { User } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { HiX, HiTruck, HiCalendar, HiSearch, HiDownload } from 'react-icons/hi';
import { toast } from 'sonner';

interface Conductor {
  codigo: number;
  nombres: string;
  apellidos: string;
  login: string;
  clave: string;
  telefono: string;
  dni: string;
  email: string;
  turno: string | null;
  horainicio: string | null;
  unidadasig: string | null;
  brevete: string | null;
  sctr: string | null;
  direccion: string | null;
  imagen: string | null;
  catBrevete: string;
  fecValidBrevete: string | null;
  estBrevete: string | null;
  sexo: string | null;
  unidadActual: string | null;
  habilitado: string;
}

interface ModalGenerarReporteProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalGenerarReporte: React.FC<ModalGenerarReporteProps> = ({
  isOpen,
  onClose,
}) => {
  
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductorSeleccionado, setConductorSeleccionado] =
    useState<Conductor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [fecha, setFecha] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

    const handleClose = () => {
    setConductorSeleccionado(null);
    setSearchTerm('');
    setFecha('');
    onClose();
  };



  // Fetch conductores
  useEffect(() => {
    if (isOpen) {
      fetchConductores();
    }
  }, [isOpen]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchConductores = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://do.velsat.pe:2083/api/Preplan/conductores/movilbus',
      );
      const data = await response.json();
      setConductores(data.filter((c: Conductor) => c.habilitado === '1'));
    } catch (error) {
      console.error('Error al cargar conductores:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConductores = conductores.filter((conductor) =>
    conductor.apellidos.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelectConductor = (conductor: Conductor) => {
    setConductorSeleccionado(conductor);
    setSearchTerm(conductor.apellidos);
    setShowDropdown(false);
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(true);
    if (!value) {
      setConductorSeleccionado(null);
    }
  };

  // Función para formatear la fecha de YYYY-MM-DD a DD/MM/YYYY
  const formatFecha = (fechaISO: string): string => {
    const [year, month, day] = fechaISO.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!conductorSeleccionado || !fecha) {
      return;
    }

    setDownloading(true);

    try {
      // Formatear la fecha
      const fechaFormateada = formatFecha(fecha);
      const codConductor = conductorSeleccionado.codigo;
      const usuario = 'movilbus';

      // Construir la URL
      const url = `https://do.velsat.pe:2083/api/Preplan/ExcelServiciosConductor?codConductor=${codConductor}&fecha=${encodeURIComponent(fechaFormateada)}&usuario=${usuario}`;

      // Hacer la petición
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      // Obtener el blob del archivo
      const blob = await response.blob();

      // Crear un enlace temporal para descargar
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Nombre del archivo
      const nombreArchivo = `Reporte_${conductorSeleccionado.apellidos}_${fechaFormateada.replace(/\//g, '-')}.xlsx`;
      link.download = nombreArchivo;

      // Simular click para descargar
      document.body.appendChild(link);
      link.click();

      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Mostrar mensaje de éxito (opcional)
      console.log('Descarga exitosa');

      // Cerrar el modal después de descargar
      setTimeout(() => {
        onClose();
        // Limpiar formulario
        setConductorSeleccionado(null);
        setSearchTerm('');
        setFecha('');
      }, 500);

    } catch (error) {
    toast.error('No hay reporte para los datos seleccionados.');

      
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md transform rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl border-b border-gray-100 bg-gradient-to-br from-blue-800 to-blue-500 px-6 py-5">
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

          <div className="relative flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Generar Reporte</h2>
            <button
              onClick={handleClose}
              className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30"
              disabled={downloading}
            >
              <HiX className="h-5 w-5" />
            </button>
          </div>
          <p className="relative mt-1 text-sm text-blue-50">
            Servicios por conductor
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Input Conductor con Autocomplete */}
            <div className="relative" ref={dropdownRef}>
              <label
                htmlFor="conductor"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <HiTruck className="h-4 w-4 text-orange-500" />
                Conductor
              </label>
              <div className="relative">
                <input
                  id="conductor"
                  type="text"
                  placeholder="Buscar conductor..."
                  value={searchTerm}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                  required
                  autoComplete="off"
                  disabled={downloading}
                />
                <HiSearch className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Dropdown Autocomplete */}
              {showDropdown && searchTerm && filteredConductores.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {filteredConductores.map((conductor) => (
                    <div
                      key={conductor.codigo}
                      onClick={() => handleSelectConductor(conductor)}
                      className="cursor-pointer border-b border-gray-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-blue-400 text-sm font-bold text-white">
                          {conductor.apellidos.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-gray-900">
                            {conductor.apellidos}
                          </p>
                          <div className="mt-0.5 flex gap-3 text-xs text-gray-500">
                            <span>DNI: {conductor.dni}</span>
                            {conductor.telefono && (
                              <span>Tel: {conductor.telefono}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No hay resultados */}
              {showDropdown &&
                searchTerm &&
                filteredConductores.length === 0 &&
                !loading && (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white p-4 text-center shadow-lg">
                    <p className="text-sm text-gray-500">
                      No se encontraron conductores
                    </p>
                  </div>
                )}
            </div>

            {/* Conductor Seleccionado Badge */}
            {conductorSeleccionado && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-blue-400 text-white">
                    <User className="h-5 w-5" />
                    
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {conductorSeleccionado.apellidos}
                    </p>
                    <p className="text-xs text-gray-600">
                      Código: {conductorSeleccionado.codigo} • DNI: {conductorSeleccionado.dni}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Input Fecha */}
            <div>
              <label
                htmlFor="fecha"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <HiCalendar className="h-4 w-4 text-orange-500" />
                Fecha
              </label>
              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                required
                disabled={downloading}
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={downloading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white   transition-all hover:shadow-xl  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
              disabled={downloading}
            >
              {downloading ? (
                <>
                       <Spinner size="sm" color='default' />

                  <span>Descargando...</span>
                </>
              ) : (
                <>
                  <HiDownload className="h-4 w-4" />
                  <span>Generar Reporte</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalGenerarReporte;