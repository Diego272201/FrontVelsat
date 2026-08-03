'use client';
import React, { useState, useEffect } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFetchTalma } from './Usefetchtalma';

//  NUEVA INTERFAZ - Recibe el ref de TablaList
interface ObtenerDatosProps {
  tablaListRef: React.RefObject<any>;
}

// Mismo lenguaje visual que la cabecera de gestionconductores.
const labelClass =
  'mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500';
const inputClass =
  'h-7 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9] disabled:cursor-not-allowed disabled:opacity-50';

//  Ahora recibe props
export default function ObtenerDatos({ tablaListRef }: ObtenerDatosProps) {
  // Todo el estado está dentro del componente
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedService, setSelectedService] = useState('Salida');
  const [selectedTime, setSelectedTime] = useState('');
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [eliminandoDatos, setEliminandoDatos] = useState(false);

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
  const {
    data: horas,
    loading: loadingHoras,
    error: errorHoras,
  } = useFetchTalma<string[]>(apiUrl);

  // Resetear hora cuando cambie la fecha
  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);

  const handleCargarDatos = async () => {
    if (!selectedDate) {
      toast.warning('Por favor, selecciona una fecha');
      return;
    }
    if (!selectedTime) {
      toast.warning('Por favor, selecciona una hora');
      return;
    }

    setCargandoDatos(true);

    try {
      // Convertir fecha a formato DD/MM/YYYY
      const fechaFormateada = formatDateForAPI(selectedDate);

      // Determinar tipo: 'S' para Salida, 'I' para Entrada
      const tipo: 'S' | 'I' = selectedService === 'Salida' ? 'S' : 'I';

      console.log('Parámetros a enviar:', {
        fecha: fechaFormateada,
        hora: selectedTime,
        tipo: tipo,
        servicio: selectedService,
      });

      // Llamar a la función de TablaList para cargar datos
      if (tablaListRef.current) {
        await tablaListRef.current.cargarDatos(
          fechaFormateada,
          selectedTime,
          tipo,
        );
        toast.success('Datos cargados correctamente');
      } else {
        toast.error('Error: No se pudo conectar con la tabla');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleEliminarDatos = async () => {
    if (!selectedDate) {
      toast.warning('Por favor, selecciona una fecha para eliminar la carga');
      return;
    }

    setEliminandoDatos(true);

    try {
      // Convertir fecha a formato DD/MM/YYYY
      const fechaFormateada = formatDateForAPI(selectedDate);

      // Construir URL con parámetros
      const deleteUrl = `https://do.velsat.pe:2083/api/Talma/eliminarCarga?fecha=${encodeURIComponent(fechaFormateada)}&usuario=cgacela&empresa=TALMA`;

      console.log('🗑️ Eliminando carga:', {
        fecha: fechaFormateada,
        usuario: 'cgacela',
        empresa: 'TALMA',
        url: deleteUrl,
      });

      // Realizar petición DELETE
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Error en la petición: ${response.status} ${response.statusText}`,
        );
      }

      // Obtener respuesta (si la hay)
      const data = await response.json().catch(() => null);
      console.log('Respuesta del servidor:', data);

      toast.success('Carga eliminada correctamente');

      if (tablaListRef.current?.refrescarDatos) {
        console.log('Refrescando datos de la tabla...');
        await tablaListRef.current.refrescarDatos();
        console.log('Datos refrescados');
      }

      // Resetear los valores del formulario
      // setSelectedDate('');
      // setSelectedService('Salida');
      // setSelectedTime('');
    } catch (error) {
      console.error('Error al eliminar carga:', error);
      toast.error('Error al eliminar la carga');
    } finally {
      setEliminandoDatos(false);
    }
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white p-2 shadow-sm">
      {/* Título de tarjeta: deliberadamente discreto para no competir
          con el título de la página. */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <Download className="h-3 w-3 text-gray-500" />
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
          Obtener Datos
        </h2>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-end gap-2">
        <div>
          <label className={labelClass}>Fecha</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Servicio</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className={inputClass}
          >
            <option>Salida</option>
            <option>Entrada</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Hora</label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            disabled={!selectedDate || loadingHoras}
            className={inputClass}
          >
            <option value="">
              {!selectedDate
                ? 'Selecciona una fecha primero'
                : loadingHoras
                  ? 'Cargando horas...'
                  : errorHoras && !loadingHoras
                    ? 'No hay horas disponibles'
                    : horas && horas.length === 0
                      ? 'No hay horas disponibles'
                      : 'Selecciona una hora'}
            </option>
            {horas &&
              horas.length > 0 &&
              horas.map((hora, index) => (
                <option key={index} value={hora}>
                  {hora}
                </option>
              ))}
          </select>
        </div>

        <button
          onClick={handleCargarDatos}
          disabled={!selectedDate || !selectedTime || cargandoDatos}
          className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-brandSecondary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargandoDatos ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Cargando
            </>
          ) : (
            <>
              <Download className="h-3 w-3" />
              Obtener
            </>
          )}
        </button>
        <button
          onClick={handleEliminarDatos}
          disabled={!selectedDate || eliminandoDatos}
          className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-red-600 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {eliminandoDatos ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Eliminando
            </>
          ) : (
            <>
              <X className="h-3 w-3" />
              Eliminar Carga
            </>
          )}
        </button>
      </div>
    </div>
  );
}
