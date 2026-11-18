'use client';

import ExcelJS from 'exceljs';
import { conSegundos, formatoDiferencia, formatoSegundos } from '../utils';
import { ReporteServicio, ResumenKpisData } from './types';

const ESTADO_LABEL: Record<string, string> = {
  A_TIEMPO: 'A tiempo',
  ADELANTADO: 'Adelantado',
  RETRASADO: 'Retrasado',
  OMITIDO: 'Omitido',
  PENDIENTE: 'Pendiente',
};

/**
 * Exporta el reporte de paradas y cumplimiento a Excel (.xlsx) con estilo profesional.
 */
export async function exportarExcelReporte(
  servicios: ReporteServicio[],
  fechaTexto: string,
  filtroTexto: string,
  kpis: ResumenKpisData,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Trackvel System';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // HOJA 1: DETALLE DE PARADAS
  // -------------------------------------------------------------
  const sheet = workbook.addWorksheet('Detalle de Paradas', {
    views: [{ showGridLines: true }],
  });

  // Título principal
  sheet.mergeCells('A1:N1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'TRACKVEL SYSTEM - REPORTE DE CUMPLIMIENTO DE RUTAS Y PARADAS';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;

  // Metadata de la consulta
  sheet.mergeCells('A2:N2');
  const metaCell = sheet.getCell('A2');
  metaCell.value = `Fecha de evaluación: ${fechaTexto}  |  Filtros: ${filtroTexto}  |  Total Servicios: ${kpis.totalServicios}  |  Puntualidad Global: ${kpis.porcentajePuntualidad}%  |  Generado: ${new Date().toLocaleString('es-PE')}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  sheet.addRow([]); // Fila 3 vacía

  // Cabecera de la tabla
  const headers = [
    'Ruta Cód.',
    'Ruta Nombre',
    'Unidad',
    'Conductor',
    'N°',
    'Paradero / Punto de Control',
    'Tipo',
    'Hora Prog.',
    'Hora Llegada',
    'Permanencia',
    'Hora Salida',
    'Diferencia',
    'Estado',
    'Observaciones',
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // Datos fila por fila
  let rowIndex = 5;
  for (const s of servicios) {
    for (const p of s.paradas) {
      const difTexto =
        formatoDiferencia(p.diferenciaSeg);

      const permTexto = formatoSegundos(p.tiempoPermanenciaSeg);

      const row = sheet.addRow([
        s.rutaCodigo,
        s.rutaNombre,
        s.deviceID,
        s.conductorNombre,
        p.orden,
        p.nombre,
        p.tipo,
        conSegundos(p.horaProgramada),
        p.horaLlegadaReal ?? '—',
        permTexto,
        p.horaSalidaReal ?? '—',
        difTexto,
        ESTADO_LABEL[p.estadoPuntualidad] ?? p.estadoPuntualidad,
        p.observaciones ?? '',
      ]);

      row.height = 20;

      // Color de fondo alternado
      const bgZebra = rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Alineaciones específicas
        if ([1, 3, 5, 7, 8, 9, 10, 11, 12, 13].includes(colNum)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgZebra } };

        // Destacar columna de estado
        if (colNum === 13) {
          if (p.estadoPuntualidad === 'A_TIEMPO') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Verde suave
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } };
          } else if (p.estadoPuntualidad === 'RETRASADO') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Rojo suave
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
          } else if (p.estadoPuntualidad === 'ADELANTADO') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Ámbar suave
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
          }
        }
      });

      rowIndex++;
    }
  }

  // Ajuste automático de anchos de columnas
  const colWidths = [12, 18, 12, 22, 6, 38, 12, 12, 12, 13, 12, 12, 14, 32];
  colWidths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });

  // -------------------------------------------------------------
  // HOJA 2: RESUMEN POR SERVICIOS
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Resumen de Servicios', {
    views: [{ showGridLines: true }],
  });

  summarySheet.mergeCells('A1:K1');
  const sTitle = summarySheet.getCell('A1');
  sTitle.value = `RESUMEN DE PUNTUALIDAD Y SERVICIOS - ${fechaTexto}`;
  sTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 28;

  const summaryHeaders = [
    'Ruta',
    'Unidad',
    'Conductor',
    'Salida Prog.',
    'Salida Real',
    'Paradas Totales',
    'A Tiempo',
    'Adelantadas',
    'Retrasadas',
    '% Puntualidad',
    'Tiempo Total Paradas',
  ];

  const sHeaderRow = summarySheet.addRow(summaryHeaders);
  sHeaderRow.height = 22;
  sHeaderRow.eachCell((c) => {
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  servicios.forEach((s) => {
    const pct = s.totalParadas > 0 ? Math.round((s.paradasATiempo / s.totalParadas) * 100) : 0;
    const r = summarySheet.addRow([
      `${s.rutaCodigo} - ${s.rutaNombre}`,
      s.deviceID,
      s.conductorNombre,
      s.horaSalidaProgramada,
      s.horaSalidaReal ?? '—',
      s.totalParadas,
      s.paradasATiempo,
      s.paradasAdelantadas,
      s.paradasRetrasadas,
      `${pct}%`,
      formatoSegundos(s.tiempoTotalParadasSeg),
    ]);
    r.height = 20;
    r.eachCell((c, colNum) => {
      c.font = { name: 'Calibri', size: 10 };
      c.alignment = {
        horizontal: colNum === 1 || colNum === 3 ? 'left' : 'center',
        vertical: 'middle',
      };
      c.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
  });

  [24, 12, 24, 12, 12, 14, 12, 12, 12, 14, 18].forEach((w, idx) => {
    summarySheet.getColumn(idx + 1).width = w;
  });

  // Descarga del archivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_Cumplimiento_Rutas_${fechaTexto.replace(/[\/\s]+/g, '-')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
