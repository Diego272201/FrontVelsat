'use client';
import React, { useState, useEffect } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFetchTalma } from './Usefetchtalma';

export default function ObtenerDatos() {
  // Todo el estado está dentro del componente
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedService, setSelectedService] = useState('Entrada');
  const [selectedTime, setSelectedTime] = useState('');

  // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY para la API
  const formatDateForAPI = (date: string): string => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  // Construir URL de la API solo si hay fecha seleccionada
  const apiUrl = selectedDate
    ? `https://do.velsat.pe:2083/api/Talma/GetHoras?fecha=${encodeURIComponent(formatDateForAPI(selectedDate))}`
    : null;

  // Usar el custom hook para obtener las horas
  const { data: horas, loading: loadingHoras, error: errorHoras } = useFetchTalma<string[]>(apiUrl);

  // Resetear hora cuando cambie la fecha
  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);

  // Funciones manejadoras
  const handleCargarDatos = () => {
    if (!selectedDate) {
      toast.warning('Por favor, selecciona una fecha');
      return;
    }
    if (!selectedTime) {
      toast.warning('Por favor, selecciona una hora');
      return;
    }

    toast.info('Función Cargar - En desarrollo');
    console.log('Cargar datos:', { selectedDate, selectedService, selectedTime });
    
    // Aquí puedes agregar tu lógica de carga
    // Por ejemplo, hacer un fetch a una API:
    // const response = await fetch(`/api/datos?fecha=${selectedDate}&servicio=${selectedService}&hora=${selectedTime}`);
  };

  const handleEliminarDatos = () => {
    toast.success('Datos eliminados');
    console.log('Eliminar datos');
    
    // Resetear los valores
    setSelectedDate('');
    setSelectedService('Entrada');
    setSelectedTime('');
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-blue-600" />
          <h2 className="text-[12px] font-semibold text-slate-800">
            Obtener Datos
          </h2>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Fecha
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Servicio
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
          >
            <option>Entrada</option>
            <option>Salida</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Hora
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            disabled={!selectedDate || loadingHoras}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {!selectedDate
                ? 'Selecciona una fecha primero'
                : loadingHoras
                ? 'Cargando horas...'
                : errorHoras && !loadingHoras
                ? 'Error al cargar horas'
                : horas && horas.length === 0
                ? 'No hay horas disponibles'
                : 'Selecciona una hora'}
            </option>
            {horas && horas.length > 0 && horas.map((hora, index) => (
              <option key={index} value={hora}>
                {hora}
              </option>
            ))}
          </select>
          {loadingHoras && (
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Cargando...</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleCargarDatos}
          disabled={!selectedDate || !selectedTime}
          className="flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-3 w-3" />
          Cargar
        </button>
        <button
          onClick={handleEliminarDatos}
          className="flex items-center justify-center gap-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-red-700 active:scale-95"
        >
          <X className="h-3 w-3" />
          Eliminar
        </button>
      </div>
    </div>
  );
}