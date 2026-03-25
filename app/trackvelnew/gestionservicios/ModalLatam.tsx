'use client';
import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import axios from 'axios';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';

interface RegistroLatam {
  codservicio: string;
  horaAtoReal: string;
  unidad: string;
  conductor: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fecha: string;
  codusuario: string;
}

export default function ModalLatam({
  isOpen,
  onClose,
  fecha,
  codusuario,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [registros, setRegistros] = useState<RegistroLatam[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [noEncontrados, setNoEncontrados] = useState<RegistroLatam[]>([]);

  if (!isOpen) return null;

  // Formatea "2026-03-23" → "23/03/2026"
  const formatearFecha = (fechaInput: string) => {
    const [y, m, d] = fechaInput.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      // Siempre primera hoja
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 3) {
        toast.error('El archivo no tiene datos suficientes.');
        return;
      }

      // ✅ Encabezados están en la fila 2 (índice 1)
      const headers: string[] = rows[1].map((h: any) => String(h ?? '').trim());

      const idx = {
        serv: headers.findIndex((h) => h === 'SERV.'),
        hato: headers.findIndex((h) => h === 'H. ATO LLEGADA REAL'),
        conductor: headers.findIndex((h) => h === 'CONDUCTOR'),
        unidad: headers.findIndex((h) => h === 'UNIDAD'),
      };

      const faltantes = Object.entries(idx)
        .filter(([, v]) => v === -1)
        .map(([k]) => k);

      if (faltantes.length > 0) {
        toast.error(`No se encontraron las columnas: ${faltantes.join(', ')}`);
        setRegistros([]);
        return;
      }

      // ✅ Función para formatear hora (puede venir como string "06:25" o número decimal de Excel)
      const formatearHora = (valor: any): string => {
        if (!valor && valor !== 0) return '';
        if (typeof valor === 'string') return valor.trim();
        if (typeof valor === 'number') {
          // Excel guarda horas como fracción del día: 0.25 = 06:00
          const totalMinutos = Math.round(valor * 24 * 60);
          const hh = Math.floor(totalMinutos / 60)
            .toString()
            .padStart(2, '0');
          const mm = (totalMinutos % 60).toString().padStart(2, '0');
          return `${hh}:${mm}`;
        }
        return String(valor);
      };

      // ✅ Datos desde fila 3 (índice 2), agrupados por SERV. (tomar solo la primera aparición)
      const seen = new Set<string>();
      const parsed: RegistroLatam[] = [];

      rows.slice(2).forEach((row) => {
        const codserv = String(row[idx.serv] ?? '').trim();
        if (!codserv || seen.has(codserv)) return;
        seen.add(codserv);

        parsed.push({
          codservicio: codserv,
          horaAtoReal: formatearHora(row[idx.hato]),
          conductor: String(row[idx.conductor] ?? '').trim(),
          unidad: String(row[idx.unidad] ?? '').trim(),
        });
      });

      if (parsed.length === 0) {
        toast.error('No se encontraron registros válidos en el archivo.');
        return;
      }

      setRegistros(parsed);
      toast.success(`${parsed.length} registros cargados correctamente.`);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleCompletar = async () => {
    if (registros.length === 0) {
      toast.error('Primero cargue un archivo Excel.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Completando servicios Latam...');

    try {
      const response = await axios.post(
        `${API_BASE_URL125}/api/Preplan/CompletarServiciosLatam`,
        { registros, fecha: formatearFecha(fecha), codusuario },
      );

      toast.dismiss(toastId);
      toast.success(`Servicios completados: ${response.data.total}`);
      setNoEncontrados(response.data.noEncontrados || []);

      // Solo cierra si no hay no encontrados
      if ((response.data.noEncontrados || []).length === 0) handleClose();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Error al completar los servicios.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRegistros([]);
    setNoEncontrados([]); // ✅ limpiar
    setNombreArchivo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex max-h-[85vh] w-[700px] flex-col rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100 px-5 py-3">
          <span className="text-sm font-semibold text-gray-700">
            Completar Servicios Latam —{' '}
            <span className="text-red-600">{fecha}</span>
          </span>
          <button
            onClick={handleClose}
            className="text-lg font-bold text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 overflow-y-auto p-5">
          {/* Zona carga archivo */}
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-6 transition hover:border-red-400 hover:bg-red-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-2xl">📂</span>
            <span className="text-[12px] font-medium text-gray-600">
              {nombreArchivo || 'Haz clic para seleccionar el archivo Excel'}
            </span>
            <span className="text-[10px] text-gray-400">
              Columnas requeridas: SERV. · H.ATO LLEGADA REAL · CONDUCTOR ·
              UNIDAD
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {/* Preview tabla */}
          {registros.length > 0 && (
            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Servicio
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      H. ATO Real
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Conductor
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Unidad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-gray-700">
                        {r.codservicio}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {r.horaAtoReal}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {r.conductor}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">{r.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* No encontrados */}
          {noEncontrados.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50">
              <div className="border-b border-red-200 px-4 py-2">
                <span className="text-[11px] font-semibold text-red-600">
                  ⚠️ {noEncontrados.length} registros no encontrados
                </span>
              </div>
              <div className="max-h-[200px] overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-red-100 text-red-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">
                        Servicio
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        H. ATO Real
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Conductor
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Unidad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {noEncontrados.map((r, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? 'bg-white' : 'bg-red-50'}
                      >
                        <td className="px-3 py-1.5 font-medium text-gray-700">
                          {r.codservicio}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">
                          {r.horaAtoReal}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">
                          {r.conductor}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">
                          {r.unidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <span className="text-[11px] text-gray-400">
            {registros.length > 0
              ? `${registros.length} registros listos`
              : 'Sin datos cargados'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCompletar}
              disabled={loading || registros.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : `Completar (${registros.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
