'use client';
import React, { useState } from 'react';
import {
  Search,
  Calendar,
  MapPin,
  Plane,
  User,
  Plus,
  Eye,
  X,
  RotateCcw,
} from 'lucide-react';

interface Service {
  id: number;
  tierra: string;
  tipo: string;
  fechaAeropuerto: string;
  conductor: string;
  unidad: string;
  aerolinea: string;
}

const ServicesSearchSystem: React.FC = () => {
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('14/08/2025 00:00');
  const [dateTo, setDateTo] = useState('14/08/2025 23:59');
  const [grupo, setGrupo] = useState('Tierra');
  const [tipo, setTipo] = useState('Salida');
  const [pasajero, setPasajero] = useState('');
  const [aerolinea, setAerolinea] = useState('TALMA');
  const [unidad, setUnidad] = useState('');
  const [conductor, setConductor] = useState('');

  const services: Service[] = [
    {
      id: 1,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 00:00',
      conductor: 'GARCIA ALZAMORA GILBERT',
      unidad: 'c177-adu815',
      aerolinea: 'TALMA',
    },
    {
      id: 2,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 00:00',
      conductor: 'PAREJA PEÑA JUAN',
      unidad: 'c253-csc243',
      aerolinea: 'TALMA',
    },
    {
      id: 3,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 00:00',
      conductor: 'CARDENAS ESCATE JONATHAN RICARDO',
      unidad: 'c132-b6d794',
      aerolinea: 'TALMA',
    },
    {
      id: 4,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 01:00',
      conductor: 'MARIÑO OJEDA CARLOS MISAEL',
      unidad: 'c234-csb150',
      aerolinea: 'TALMA',
    },
    {
      id: 5,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 01:00',
      conductor: 'CHAVEZ CANCINO JUAN CELSO',
      unidad: 'c230-csa646',
      aerolinea: 'TALMA',
    },
    {
      id: 6,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 01:00',
      conductor: 'VALENCIA FRANCO ANGEL EDUARDO',
      unidad: 'c240-csp236',
      aerolinea: 'TALMA',
    },
    {
      id: 7,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 01:00',
      conductor: 'MOZOMBITE DOMINGUEZ EDSON RAY',
      unidad: 'c223-bdp890',
      aerolinea: 'TALMA',
    },
    {
      id: 8,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 01:00',
      conductor: 'PEÑA CHOTA BRANDY',
      unidad: 'c219-bdk773',
      aerolinea: 'TALMA',
    },
    {
      id: 9,
      tierra: 'Tierra',
      tipo: 'Salida',
      fechaAeropuerto: '14/08/2025 01:00',
      conductor: 'ALZAMORA LARA JOHNNY',
      unidad: 'c233-csa605',
      aerolinea: 'TALMA',
    },
  ];

  const handleSelectService = (id: number) => {
    setSelectedServices((prev) =>
      prev.includes(id)
        ? prev.filter((serviceId) => serviceId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    setSelectedServices(services.map((service) => service.id));
  };

  const filteredServices = services.filter(
    (service) =>
      service.conductor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.unidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pasajero === '' ||
      service.conductor.toLowerCase().includes(pasajero.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3">
      <div className="mx-auto space-y-3">
        {/* Header */}

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md">
  <h1 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
    BÚSQUEDA DE SERVICIOS
  </h1>

  {/* Search Filters */}
  <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Desde:
        </label>
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 transform text-slate-400" />
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Hasta:
        </label>
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 transform text-slate-400" />
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">
        Grupo:
      </label>
      <select
        value={grupo}
        onChange={(e) => setGrupo(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        <option value="Tierra">Tierra</option>
        <option value="Aire">Aire</option>
      </select>
    </div>

    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">
        Tipo:
      </label>
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        <option value="Salida">Salida</option>
        <option value="Llegada">Llegada</option>
      </select>
    </div>

    <div className="flex items-end gap-2">
      <button className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-[15px] text-xs leading-none font-medium text-white hover:bg-blue-700 transition-colors">
        <Search className="h-3 w-3" />
        Total Servicios
      </button>
      <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-[15px] text-xs leading-none font-medium text-white hover:bg-emerald-700 transition-colors">
        <Search className="h-3 w-3" />
        Buscar
      </button>
      <button className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-[15px] text-xs leading-none font-medium text-white hover:bg-blue-700 transition-colors">
        <Plus className="h-3 w-3" />
        Nuevo Servicio
      </button>
    </div>
  </div>
</div>

     

        {/* Driver Assignment */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <User className="h-4 w-4 text-blue-600" />
            Asignación Conductor/Unidad
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Unidad:
              </label>
              <input
                type="text"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Conductor:
              </label>
              <input
                type="text"
                value={conductor}
                onChange={(e) => setConductor(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Asignar
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md">
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Filtros</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Pasajero:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 transform text-slate-400" />
                  <input
                    type="text"
                    value={pasajero}
                    onChange={(e) => setPasajero(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar pasajero..."
                  />
                </div>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                  Buscar Pasajero
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Aerolíneas:
              </label>
              <div className="flex gap-2">
                <select
                  value={aerolinea}
                  onChange={(e) => setAerolinea(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TALMA">TALMA</option>
                  <option value="LATAM">LATAM</option>
                  <option value="AVIANCA">AVIANCA</option>
                </select>
                <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700">
                  Resumen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <MapPin className="h-4 w-4 text-blue-600" />
                Lista de Servicios ({filteredServices.length})
              </h2>
              <button
                onClick={handleSelectAll}
                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                Seleccionar Todos
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700">
            <div className="col-span-1 flex items-center justify-center">
              Sel.
            </div>
            <div className="col-span-1">Número</div>
            <div className="col-span-1">Tierra/Aire</div>
            <div className="col-span-1">Tipo</div>
            <div className="col-span-2">Fecha Aeropuerto</div>
            <div className="col-span-2">Conductor</div>
            <div className="col-span-1">Unidad</div>
            <div className="col-span-1">Aerolínea</div>
            <div className="col-span-2">Acciones</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100">
            {filteredServices.map((service, index) => (
              <div
                key={service.id}
                className={`grid grid-cols-12 gap-2 p-2 transition-colors hover:bg-slate-50 ${selectedServices.includes(service.id) ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''}`}
              >
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.id)}
                    onChange={() => handleSelectService(service.id)}
                    className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-1 flex items-center text-sm font-medium text-slate-900">
                  {service.id}
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                    {service.tierra}
                  </span>
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                    {service.tipo}
                  </span>
                </div>
                <div className="col-span-2 flex items-center font-mono text-xs text-slate-700">
                  {service.fechaAeropuerto}
                </div>
                <div className="col-span-2 flex items-center text-sm font-medium text-slate-900">
                  {service.conductor}
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                    {service.unidad}
                  </span>
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800">
                    <Plane className="h-2 w-2" />
                    {service.aerolinea}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <button
                    className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-50"
                    title="Reiniciar"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button
                    className="rounded p-1 text-emerald-600 transition-colors hover:bg-emerald-50"
                    title="Ver Pasajeros"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    className="rounded p-1 text-red-600 transition-colors hover:bg-red-50"
                    title="Cancelar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredServices.length === 0 && (
            <div className="p-8 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <h3 className="mb-1 text-base font-medium text-slate-500">
                No se encontraron servicios
              </h3>
              <p className="text-sm text-slate-400">
                Ajusta los filtros de búsqueda para ver más resultados.
              </p>
            </div>
          )}
        </div>

        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-blue-900">
                  {selectedServices.length} servicio
                  {selectedServices.length !== 1 ? 's' : ''} seleccionado
                  {selectedServices.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setSelectedServices([])}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Limpiar selección
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesSearchSystem;
