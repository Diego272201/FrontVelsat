"use client";
import React, { useState } from 'react';
import { Upload, X, Download, Filter, Users, Briefcase, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

export default function Header() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedService, setSelectedService] = useState('Entrada');
  const [selectedDate, setSelectedDate] = useState('2025-12-16');
  const [selectedTime, setSelectedTime] = useState('00:00');
  const [filterType, setFilterType] = useState('Todos');
  const [passengerFilter, setPassengerFilter] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <>
      {/* Header Compacto */}
      <div className="bg-[#113EB9]">

        <div className=" px-4 py-1.5 flex items-center justify-between">
          <h1 className="text-[12px] font-bold text-white uppercase">Módulo de Planificación de Servicios Talma</h1>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/20 active:scale-95"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Mostrar
              </>
            )}
          </button>

        </div>
      </div>

      {/* Contenido colapsable */}
      {isExpanded && (
        <div className="mx-auto px-4 py-4">
          {/* FILA 1: Carga + Controles + Filtros + Estadísticas */}
<div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_0.5fr] gap-3">            {/* Carga de Archivos */}
            <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">Carga de Archivos</h2>
              </div>
              
              <div className="space-y-2">
                <label className="block">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center gap-2 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-2 cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50"
                  >
                    <Upload className="h-4 w-4 text-slate-400" />
                    <span className="text-xs text-slate-600 truncate">
                      {selectedFile ? selectedFile.name : 'Ningún archivo seleccionado'}
                    </span>
                  </label>
                </label>

                <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95">
                  Subir
                </button>
              </div>
            </div>

            {/* Controles */}
            <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-slate-800">Obtener Datos</h2>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Fecha</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Servicio</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  >
                    <option>Entrada</option>
                    <option>Salida</option>
                    <option>Conexión</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Hora</label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95">
                  <Download className="h-3 w-3" />
                  Cargar
                </button>
                <button className="flex items-center justify-center gap-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-red-700 active:scale-95">
                  <X className="h-3 w-3" />
                  Eliminar
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">Filtrar Datos</h2>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Tipo</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  >
                    <option>Todos</option>
                    <option>VIP</option>
                    <option>Regular</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Pasajero</label>
                  <input
                    type="text"
                    value={passengerFilter}
                    onChange={(e) => setPassengerFilter(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <button className="flex items-center justify-center gap-1 rounded-md bg-red-100 px-2 py-1.5 text-xs font-medium text-red-700 transition-all hover:bg-red-200 active:scale-95">
                  <Trash2 className="h-3 w-3" />
                  Elim.
                </button>
                <button className="flex items-center justify-center gap-1 rounded-md bg-amber-100 px-2 py-1.5 text-xs font-medium text-amber-700 transition-all hover:bg-amber-200 active:scale-95">
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
                <button className="flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95">
                  <Plus className="h-3 w-3" />
                  Grupo
                </button>
              </div>
            </div>

            {/* Estadísticas - En una sola columna */}
            <div className="flex flex-col gap-3 ">
              {/* Total Servicios */}
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-md text-white flex-1">
                <div className="flex items-center justify-between h-full">
                  <div>
                    <p className="text-xs font-medium text-blue-100 mb-0.5">Servicios</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                    <Briefcase className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Total Pasajeros */}
              <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-md text-white flex-1">
                <div className="flex items-center justify-between h-full">
                  <div>
                    <p className="text-xs font-medium text-emerald-100 mb-0.5">Pasajeros</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}