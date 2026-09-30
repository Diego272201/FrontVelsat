'use client';

import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VisitaItem, ResumenItem } from './reportsApi';

const BRAND_BLUE = '113EB9';
const BRAND_ORANGE = 'FB7B0F';
const BRAND_DARK = '0C2D78';

export interface ExportVisitasOptions {
  accountID?: string;
  geofenceName?: string;
  vehicleName?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  formatDurationText: (
    minutes?: number | null,
    isInside?: boolean,
    fechaEntrada?: string | null,
    fechaSalida?: string | null,
  ) => string;
}

export interface ExportResumenOptions {
  accountID?: string;
  geofenceName?: string;
  vehicleName?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

/**
 * Genera el isotipo oficial de Velsat como un badge cuadrado 1:1 con fondo naranja
 * corporativo (#FB7B0F) y el logo blanco centrado, tal como se muestra en el header
 * y sidebar de la aplicación web.
 */
async function getSquareOrangeLogoBase64(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 180; // Alta resolución para nitidez en Excel y PDF
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // 1. Fondo naranja corporativo Velsat (#FB7B0F)
        ctx.fillStyle = '#FB7B0F';
        ctx.fillRect(0, 0, size, size);

        // 2. Centrar el pin blanco de Velsat recortando el área visible real de LogoWeb.png (235 x 411)
        // para eliminar los márgenes transparentes asimétricos del archivo original
        // y asegurar un centrado 100% geométrico y visual.
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const isStandard = imgW === 235 && imgH === 411;

        const srcX = isStandard ? 27 : 0;
        const srcY = isStandard ? 44 : 0;
        const srcW = isStandard ? 188 : imgW;
        const srcH = isStandard ? 312 : imgH;

        // Tamaño más prominente y nítido para Excel y PDF
        const padding = 16;
        const maxW = size - padding * 2;
        const maxH = size - padding * 2;
        const aspect = srcW / srcH;

        let drawH = maxH;
        let drawW = drawH * aspect;

        if (drawW > maxW) {
          drawW = maxW;
          drawH = maxW / aspect;
        }

        const x = (size - drawW) / 2;
        const y = (size - drawH) / 2;

        ctx.drawImage(img, srcX, srcY, srcW, srcH, x, y, drawW, drawH);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = '/LogoWeb.png';
    });
  } catch {
    return null;
  }
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/* ========================================================================== */
/* 1. EXPORTACIÓN DE VISITAS A EXCEL (.xlsx profesional con ExcelJS)           */
/* ========================================================================== */
export async function exportVisitasToExcel(
  visitas: VisitaItem[],
  options: ExportVisitasOptions,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Velsat GPS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Visitas Geocercas', {
    views: [{ state: 'frozen', ySplit: 6 }],
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // Definir columnas y anchos óptimos (Columna A para # y logo cuadrado)
  sheet.columns = [
    { key: 'num', width: 8.5 },
    { key: 'vehiculo', width: 20 },
    { key: 'geocerca', width: 30 },
    { key: 'entrada', width: 25 },
    { key: 'salida', width: 25 },
    { key: 'duracion', width: 20 },
  ];

  const totalCols = 6;

  // Fila 1: Altura para cabecera corporativa (48 pt = 64 px, relación 1:1 con columna A)
  sheet.getRow(1).height = 48;

  // Celda A1: Fondo naranja corporativo para el logo cuadrado
  const cellA1 = sheet.getCell(1, 1);
  cellA1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${BRAND_ORANGE}` },
  };

  // Celdas B1 a F1: Barra azul con el título
  sheet.mergeCells(1, 2, 1, totalCols);
  const titleCell = sheet.getCell(1, 2);
  titleCell.value = 'VELSAT — REPORTE DE VISITAS Y PERMANENCIA EN GEOCERCAS';
  titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${BRAND_BLUE}` },
  };

  // Agregar el logo en celda A1 ocupando el 100% de la celda de forma exacta
  const logoBase64 = await getSquareOrangeLogoBase64();
  if (logoBase64) {
    try {
      const cleanBase64 = logoBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageId = workbook.addImage({
        base64: cleanBase64,
        extension: 'png',
      });
      sheet.addImage(imageId, 'A1:A1');
    } catch (e) {
      console.warn('No se pudo incrustar el logo en Excel:', e);
    }
  }

  // Fila 2: Barra de acento naranja corporativo que abarca todo el ancho
  sheet.mergeCells(2, 1, 2, totalCols);
  const orangeBar = sheet.getCell(2, 1);
  orangeBar.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${BRAND_ORANGE}` },
  };
  sheet.getRow(2).height = 4;

  // Fila 3 y 4: Metadatos y Filtros
  sheet.mergeCells(3, 1, 3, totalCols);
  const metaCell1 = sheet.getCell(3, 1);
  metaCell1.value = `Cuenta: ${(options.accountID || 'MOVILBUS').toUpperCase()}   |   Periodo: ${options.fechaDesde || '-'} al ${options.fechaHasta || '-'}   |   Geocerca: ${options.geofenceName || 'Todas'}   |   Vehículo: ${options.vehicleName || 'Todos'}`;
  metaCell1.font = { size: 9.5, bold: true, color: { argb: 'FF334155' } };
  metaCell1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  metaCell1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  sheet.getRow(3).height = 20;

  sheet.mergeCells(4, 1, 4, totalCols);
  const metaCell2 = sheet.getCell(4, 1);
  metaCell2.value = `Total de visitas registradas: ${visitas.length}   ·   Fecha y hora de exportación: ${new Date().toLocaleString('es-PE')}`;
  metaCell2.font = { size: 9, italic: true, color: { argb: 'FF64748B' } };
  metaCell2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  metaCell2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };
  sheet.getRow(4).height = 18;

  // Fila 5: Separador en blanco
  sheet.getRow(5).height = 8;

  // Fila 6: Encabezados de tabla
  const headerRow = sheet.getRow(6);
  headerRow.values = [
    '#',
    'Vehículo',
    'Geocerca',
    'Fecha / Hora Entrada',
    'Fecha / Hora Salida',
    'Duración',
  ];
  headerRow.height = 26;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${BRAND_BLUE}` },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 3 ? 'left' : 'center',
    };
    cell.border = {
      top: { style: 'medium', color: { argb: `FF${BRAND_DARK}` } },
      bottom: { style: 'medium', color: { argb: `FF${BRAND_DARK}` } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // Filas de Datos
  visitas.forEach((v, index) => {
    const rowIndex = 7 + index;
    const row = sheet.getRow(rowIndex);

    const isInside = !v.fechaSalida;
    const durText = options.formatDurationText(
      v.duracionMinutos,
      isInside,
      v.fechaEntrada,
      v.fechaSalida,
    );

    const salidaText = isInside ? 'Dentro de geocerca' : formatDate(v.fechaSalida);

    row.values = [
      index + 1,
      v.deviceID || '—',
      v.geofenceName || `Geocerca #${v.geofenceID}`,
      formatDate(v.fechaEntrada),
      salidaText,
      durText,
    ];

    row.height = 20;

    const isEven = index % 2 === 1;
    row.eachCell((cell, colNumber) => {
      cell.font = {
        size: 9.5,
        color: { argb: 'FF1E293B' },
        bold: colNumber === 2 || colNumber === 6,
      };

      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }

      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 3 ? 'left' : 'center',
      };

      if (colNumber === 5 && isInside) {
        cell.font = { bold: true, color: { argb: 'FF059669' }, size: 9.5 };
      }
    });
  });

  if (visitas.length > 0) {
    sheet.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: 6 + visitas.length, column: totalCols },
    };
  }

  // Descarga del archivo .xlsx
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `Reporte_Visitas_Velsat_${options.fechaDesde || 'inicio'}_${options.fechaHasta || 'fin'}.xlsx`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ========================================================================== */
/* 2. EXPORTACIÓN DE VISITAS A PDF (.pdf profesional con jsPDF + autoTable)    */
/* ========================================================================== */
export async function exportVisitasToPdf(
  visitas: VisitaItem[],
  options: ExportVisitasOptions,
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Logo corporativo cuadrado con fondo naranja y pin blanco
  const logoBase64 = await getSquareOrangeLogoBase64();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, 10, 16, 16);
    } catch (e) {
      console.warn('No se pudo renderizar logo en PDF:', e);
    }
  }

  // 2. Título institucional al lado del logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 62, 185); // #113EB9
  doc.text('VELSAT GPS — GESTIÓN DE FLOTAS', 34, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Reporte de Visitas y Permanencia en Geocercas', 34, 22);

  // Línea divisoria naranja institucional (#FB7B0F)
  doc.setDrawColor(251, 123, 15);
  doc.setLineWidth(1.2);
  doc.line(14, 29, pageWidth - 14, 29);

  // 3. Tarjeta de Filtros / Metadatos
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 32, pageWidth - 28, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 32, pageWidth - 28, 16, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  doc.text(`Cuenta:`, 18, 37);
  doc.setFont('helvetica', 'normal');
  doc.text(`${(options.accountID || 'MOVILBUS').toUpperCase()}`, 32, 37);

  doc.setFont('helvetica', 'bold');
  doc.text(`Periodo:`, 72, 37);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.fechaDesde || '-'} al ${options.fechaHasta || '-'}`, 86, 37);

  doc.setFont('helvetica', 'bold');
  doc.text(`Geocerca:`, 140, 37);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.geofenceName || 'Todas'}`, 156, 37);

  doc.setFont('helvetica', 'bold');
  doc.text(`Vehículo:`, 18, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.vehicleName || 'Todos'}`, 32, 44);

  doc.setFont('helvetica', 'bold');
  doc.text(`Total registros:`, 72, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`${visitas.length} visitas`, 94, 44);

  doc.setFont('helvetica', 'bold');
  doc.text(`Emisión:`, 140, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`${new Date().toLocaleString('es-PE')}`, 156, 44);

  // 4. Tabla con jspdf-autotable
  const tableData = visitas.map((v, i) => {
    const isInside = !v.fechaSalida;
    const durText = options.formatDurationText(
      v.duracionMinutos,
      isInside,
      v.fechaEntrada,
      v.fechaSalida,
    );
    const salida = isInside ? 'Dentro' : formatDate(v.fechaSalida);

    return [
      String(i + 1),
      v.deviceID || '—',
      v.geofenceName || `Geocerca #${v.geofenceID}`,
      formatDate(v.fechaEntrada),
      salida,
      durText,
    ];
  });

  autoTable(doc, {
    startY: 52,
    head: [['#', 'Vehículo', 'Geocerca', 'Entrada', 'Salida', 'Duración']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [17, 62, 185], // #113EB9
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
      2: { halign: 'left', cellWidth: 42 },
      3: { halign: 'center', cellWidth: 38 },
      4: { halign: 'center', cellWidth: 38 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
    },
    didDrawPage: (data) => {
      // Pie de página corporativo
      const str = `Página ${data.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Velsat GPS · Plataforma de Rastreo y Telemetría Vehicular · Documento oficial de control',
        14,
        pageHeight - 8,
      );
      doc.text(str, pageWidth - 14 - doc.getTextWidth(str), pageHeight - 8);
    },
  });

  const fileName = `Reporte_Visitas_Velsat_${options.fechaDesde || 'inicio'}_${options.fechaHasta || 'fin'}.pdf`;
  doc.save(fileName);
}

/* ========================================================================== */
/* 3. EXPORTACIÓN DE RESUMEN A EXCEL (.xlsx)                                  */
/* ========================================================================== */
export async function exportResumenToExcel(
  resumen: ResumenItem[],
  options: ExportResumenOptions,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Velsat GPS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Resumen Geocercas', {
    views: [{ state: 'frozen', ySplit: 6 }],
  });

  sheet.columns = [
    { key: 'num', width: 8.5 },
    { key: 'vehiculo', width: 22 },
    { key: 'geocerca', width: 32 },
    { key: 'visitas', width: 16 },
    { key: 'tiempoTotal', width: 20 },
    { key: 'promedio', width: 20 },
  ];

  const totalCols = 6;

  sheet.getRow(1).height = 48;

  // Celda A1: Fondo naranja corporativo para el logo
  const cellA1 = sheet.getCell(1, 1);
  cellA1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${BRAND_ORANGE}` },
  };

  // Celdas B1 a F1: Barra azul con el título
  sheet.mergeCells(1, 2, 1, totalCols);
  const titleCell = sheet.getCell(1, 2);
  titleCell.value = 'VELSAT — RESUMEN ESTADÍSTICO DE GEOCERCAS';
  titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${BRAND_BLUE}` },
  };

  // Agregar logo en celda A1 ocupando el 100% de la celda de forma exacta
  const logoBase64 = await getSquareOrangeLogoBase64();
  if (logoBase64) {
    try {
      const cleanBase64 = logoBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageId = workbook.addImage({
        base64: cleanBase64,
        extension: 'png',
      });
      sheet.addImage(imageId, 'A1:A1');
    } catch (e) {
      console.warn('Error al incrustar logo en Excel Resumen:', e);
    }
  }

  // Barra naranja fila 2
  sheet.mergeCells(2, 1, 2, totalCols);
  sheet.getCell(2, 1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${BRAND_ORANGE}` },
  };
  sheet.getRow(2).height = 4;

  // Metadatos
  sheet.mergeCells(3, 1, 3, totalCols);
  sheet.getCell(3, 1).value = `Cuenta: ${(options.accountID || 'MOVILBUS').toUpperCase()}   |   Periodo: ${options.fechaDesde || '-'} al ${options.fechaHasta || '-'}   |   Geocerca: ${options.geofenceName || 'Todas'}`;
  sheet.getCell(3, 1).font = { size: 9.5, bold: true, color: { argb: 'FF334155' } };
  sheet.getCell(3, 1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  sheet.getRow(3).height = 20;

  sheet.mergeCells(4, 1, 4, totalCols);
  sheet.getCell(4, 1).value = `Total registros consolidados: ${resumen.length}   ·   Fecha de exportación: ${new Date().toLocaleString('es-PE')}`;
  sheet.getCell(4, 1).font = { size: 9, italic: true, color: { argb: 'FF64748B' } };
  sheet.getCell(4, 1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };
  sheet.getRow(4).height = 18;

  sheet.getRow(5).height = 8;

  // Encabezados
  const headerRow = sheet.getRow(6);
  headerRow.values = [
    '#',
    'Vehículo',
    'Geocerca',
    'Total Visitas',
    'Permanencia Total',
    'Promedio / Visita',
  ];
  headerRow.height = 26;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${BRAND_BLUE}` },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 3 ? 'left' : 'center',
    };
  });

  resumen.forEach((r, idx) => {
    const row = sheet.getRow(7 + idx);
    row.values = [
      idx + 1,
      r.deviceID || 'Todos',
      r.geofenceName || `#${r.geofenceID}`,
      r.totalVisitas || 0,
      `${r.minutosTotales || 0} min`,
      `${r.minutosPromedioPorVisita !== undefined ? Number(r.minutosPromedioPorVisita).toFixed(1) : '0'} min`,
    ];
    row.height = 20;
    if (idx % 2 === 1) {
      row.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
    row.eachCell((c, colNum) => {
      c.alignment = { vertical: 'middle', horizontal: colNum === 3 ? 'left' : 'center' };
      c.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Resumen_Geocercas_Velsat_${options.fechaDesde || 'inicio'}_${options.fechaHasta || 'fin'}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ========================================================================== */
/* 4. EXPORTACIÓN DE RESUMEN A PDF (.pdf)                                     */
/* ========================================================================== */
export async function exportResumenToPdf(
  resumen: ResumenItem[],
  options: ExportResumenOptions,
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Logo cuadrado naranja
  const logoBase64 = await getSquareOrangeLogoBase64();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, 10, 16, 16);
    } catch (e) {
      console.warn('Error al incrustar logo en PDF Resumen:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 62, 185);
  doc.text('VELSAT GPS — GESTIÓN DE FLOTAS', 34, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Resumen Estadístico de Visitas a Geocercas', 34, 22);

  doc.setDrawColor(251, 123, 15);
  doc.setLineWidth(1.2);
  doc.line(14, 29, pageWidth - 14, 29);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 32, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 32, pageWidth - 28, 14, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  doc.text(`Cuenta:`, 18, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`${(options.accountID || 'MOVILBUS').toUpperCase()}`, 32, 40);

  doc.setFont('helvetica', 'bold');
  doc.text(`Periodo:`, 72, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.fechaDesde || '-'} al ${options.fechaHasta || '-'}`, 86, 40);

  doc.setFont('helvetica', 'bold');
  doc.text(`Total agrupados:`, 140, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`${resumen.length} registros`, 166, 40);

  const tableData = resumen.map((r, i) => [
    String(i + 1),
    r.deviceID || 'Todos',
    r.geofenceName || `#${r.geofenceID}`,
    String(r.totalVisitas || 0),
    `${r.minutosTotales || 0} min`,
    `${r.minutosPromedioPorVisita !== undefined ? Number(r.minutosPromedioPorVisita).toFixed(1) : '0'} min`,
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Vehículo', 'Geocerca', 'Visitas', 'Tiempo Total', 'Promedio']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [17, 62, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 32 },
      2: { halign: 'left', cellWidth: 50 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 32 },
    },
    didDrawPage: (data) => {
      const str = `Página ${data.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Velsat GPS · Plataforma de Rastreo y Telemetría Vehicular',
        14,
        pageHeight - 8,
      );
      doc.text(str, pageWidth - 14 - doc.getTextWidth(str), pageHeight - 8);
    },
  });

  const fileName = `Resumen_Geocercas_Velsat_${options.fechaDesde || 'inicio'}_${options.fechaHasta || 'fin'}.pdf`;
  doc.save(fileName);
}
