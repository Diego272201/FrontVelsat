'use client';

import ExcelJS from 'exceljs';
import { conSegundos, formatoDiferencia, formatoSegundos } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

/**
 * Exporta el reporte a PDF horizontal (Landscape A4) con resumen de KPIs y tabla detallada.
 */
export async function exportarPdfReporte(
  servicios: ReporteServicio[],
  fechaTexto: string,
  filtroTexto: string,
  kpis: ResumenKpisData,
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Franja de cabecera azul corporativo
  doc.setFillColor(30, 64, 175); // #1E40AF
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TRACKVEL SYSTEM - REPORTE DE CUMPLIMIENTO DE RUTAS Y PARADAS', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Fecha: ${fechaTexto}   |   Filtros: ${filtroTexto}   |   Generado: ${new Date().toLocaleString('es-PE')}`,
    14,
    18,
  );

  // 2. Tarjetas de KPIs resumidos
  const startY = 27;
  const kpiWidth = (pageWidth - 28 - 20) / 5; // 5 tarjetas
  const kpiHeight = 15;

  const kpisItems = [
    { label: 'SERVICIOS', val: `${kpis.totalServicios}`, color: [30, 64, 175] },
    { label: 'PARADAS TOTALES', val: `${kpis.totalParadas}`, color: [71, 85, 105] },
    { label: 'PUNTUALIDAD GLOBAL', val: `${kpis.porcentajePuntualidad}%`, color: [22, 163, 74] },
    { label: 'PARADAS RETRASADAS', val: `${kpis.paradasRetrasadas}`, color: [220, 38, 38] },
    { label: 'PROMEDIO EN PARADA', val: formatoSegundos(kpis.promedioPermanenciaSeg), color: [202, 138, 4] },
  ];

  kpisItems.forEach((item, i) => {
    const x = 14 + i * (kpiWidth + 5);
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.roundedRect(x, startY, kpiWidth, kpiHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.label, x + 4, startY + 5.5);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(item.val, x + 4, startY + 12);
  });

  // 3. Filas de la tabla para autoTable
  const bodyData: (string | number)[][] = [];

  for (const s of servicios) {
    for (const p of s.paradas) {
      const difTexto =
        formatoDiferencia(p.diferenciaSeg);

      const permTexto = formatoSegundos(p.tiempoPermanenciaSeg);

      bodyData.push([
        s.rutaCodigo,
        s.deviceID,
        p.orden,
        p.nombre,
        conSegundos(p.horaProgramada),
        p.horaLlegadaReal ?? '—',
        permTexto,
        p.horaSalidaReal ?? '—',
        difTexto,
        ESTADO_LABEL[p.estadoPuntualidad] ?? p.estadoPuntualidad,
        p.observaciones || s.conductorNombre,
      ]);
    }
  }

  autoTable(doc, {
    startY: startY + kpiHeight + 5,
    margin: { left: 14, right: 14, bottom: 15 },
    head: [
      [
        'Ruta',
        'Unidad',
        'N°',
        'Paradero / Punto de Control',
        'Prog.',
        'Llegada',
        'Permanencia',
        'Salida',
        'Dif.',
        'Estado',
        'Detalle / Observación',
      ],
    ],
    body: bodyData,
    styles: {
      fontSize: 8,
      cellPadding: 1.8,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 8 },
      3: { cellWidth: 65 }, // Paradero
      4: { halign: 'center', cellWidth: 15 },
      5: { halign: 'center', cellWidth: 15 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 15 },
      8: { halign: 'center', cellWidth: 14 },
      9: { halign: 'center', cellWidth: 22 },
      10: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Destacar celda de Estado
      if (data.section === 'body' && data.column.index === 9) {
        const val = String(data.cell.raw);
        if (val === 'A tiempo') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Retrasado') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Adelantado') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (data) => {
      // Pie de página
      const pageNumber = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Trackvel System  |  Página ${data.pageNumber} de ${pageNumber}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'right' },
      );
    },
  });

  doc.save(`Reporte_Cumplimiento_Rutas_${fechaTexto.replace(/[\/\s]+/g, '-')}.pdf`);
}
