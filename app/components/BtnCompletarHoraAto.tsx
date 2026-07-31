'use client';
import React from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useApi } from '@/context/ApiContext';
import { useSession } from 'next-auth/react';

interface Servicio {
  codServicio: string;
  tipo: string;
  destino: string;
  unidadSF: string | null;
  estado: string;
  fechaCompleta: string;
}

interface Props {
  data: Servicio[];
}

const ventanaDeUnaHora = (
  fechaStr: string,
): { startDate: string; endDate: string } => {
  const [fecha, hora] = fechaStr.split(' ');
  const [dia, mes, anio] = fecha.split('/').map(Number);
  const [hh, mm] = hora.split(':').map(Number);

  const date = new Date(anio, mes - 1, dia, hh, mm);

  const start = new Date(date.getTime() - 60 * 60 * 1000); // -1 hora exacta
  const end = new Date(date.getTime() + 60 * 60 * 1000); // +1 hora exacta

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return { startDate: fmt(start), endDate: fmt(end) };
};

const estaEnGeocerca = (lat: number, lng: number): boolean => {
  const poligono = [
    { lat: -12.033845, lng: -77.112442 },
    { lat: -12.030043, lng: -77.1144 },
    { lat: -12.031523, lng: -77.117555 },
    { lat: -12.0354, lng: -77.115657 },
  ];

  let dentro = false;
  const n = poligono.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poligono[i].lat,
      yi = poligono[i].lng;
    const xj = poligono[j].lat,
      yj = poligono[j].lng;
    const intersecta =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersecta) dentro = !dentro;
  }

  return dentro;
};

export default function BtnCompletarHoraAto({ data }: Props) {
  const { baseUrl } = useApi();
  const { data: session } = useSession();
  const username = session?.user.username;

  const handleCompletarHoraRealAto = async () => {
    const serviciosFiltrados = data.filter(
      (item) =>
        item.tipo === 'RECOJO' &&
        item.destino === '4175' &&
        item.unidadSF != null &&
        ['FA', 'FT', 'PR'].includes(item.estado),
    );

    if (serviciosFiltrados.length === 0) {
      toast.error('No hay servicios que cumplan los criterios.');
      return;
    }

    const toastId = toast.loading('Obteniendo puntos GPS...', {
      position: 'bottom-right',
    });

    const listaParaEnviar: { codservicio: string; fechaObtenida: string }[] =
      [];

    for (const servicio of serviciosFiltrados) {
      if (!servicio.fechaCompleta || servicio.fechaCompleta === '-') continue;

      const { startDate, endDate } = ventanaDeUnaHora(servicio.fechaCompleta);
      const deviceId = servicio.unidadSF!.toLowerCase();
      const url = `${baseUrl}/api/Reporting/details/${encodeURIComponent(startDate)}/${encodeURIComponent(endDate)}/${deviceId}/${username}`;

      try {
        const response = await axios.get(url);
        const puntos: {
          latitude: number;
          longitude: number;
          date: string;
          time: string;
          speed: number;
        }[] = response.data?.result ?? [];

        console.log(
          `[${servicio.codServicio}] Puntos obtenidos:`,
          puntos.length,
        );

        const primerPuntoEnGeocerca = puntos.find((p) =>
          estaEnGeocerca(p.latitude, p.longitude),
        );

        if (primerPuntoEnGeocerca) {
          listaParaEnviar.push({
            codservicio: servicio.codServicio,
            fechaObtenida: `${primerPuntoEnGeocerca.date} ${primerPuntoEnGeocerca.time}`,
          });
        }
      } catch (error) {
        console.error(
          `[${servicio.codServicio}] Error obteniendo recorrido:`,
          error,
        );
      }
    }

    if (listaParaEnviar.length === 0) {
      toast.dismiss(toastId);
      toast.error('No se encontraron puntos GPS dentro de la geocerca.');
      return;
    }

    const putUrl = `${baseUrl}/api/Preplan/horallegadageo`;

    try {
      const response = await axios.put(putUrl, listaParaEnviar);
      toast.success(
        `Actualización exitosa: ${response.data.actualizados} servicios actualizados.`,
        { id: toastId },
      );
    } catch (error: any) {
      toast.error('Error al actualizar los horarios.', { id: toastId });
    }
  };

  return (
    <button
      onClick={handleCompletarHoraRealAto}
      className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-brandPrimary px-2.5 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-brandPrimary-hover whitespace-nowrap"
    >
      Geocerca Completar hora ATO
    </button>
  );
}
