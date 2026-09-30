import ExcelJS from 'exceljs';

const BRAND_BLUE = 'FF113EB9';
const BRAND_BLUE_DARK = 'FF0C2D78';
const HEADER_ROW_INDEX = 4;

export interface ColumnaExcel {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
  /** Color de texto (ARGB) para las celdas no vacías de esta columna, ej. hora de inicio en verde. */
  colorTexto?: string;
}

export interface HojaExcel {
  sheetName: string;
  titulo: string;
  subtitulo: string;
  columnas: ColumnaExcel[];
  filas: (string | number | null)[][];
  /** Índice (0-based) de la columna cuyo texto se colorea según el estado. */
  columnaEstado?: number;
  /** Fila de totales al final de la tabla; el primer valor va en la primera columna. */
  totales?: (string | number | null)[];
}

const COLORES_ESTADO: Record<string, { fondo: string; texto: string }> = {
  Pendiente: { fondo: 'FFFEF3C7', texto: 'FF92400E' },
  'Visto por Conductor': { fondo: 'FFDBEAFE', texto: 'FF1E40AF' },
  'Confirmado por Conductor': { fondo: 'FFE0E7FF', texto: 'FF3730A3' },
  'Finalizado por Conductor': { fondo: 'FFD1FAE5', texto: 'FF065F46' },
  'Stand By': { fondo: 'FFFFEDD5', texto: 'FF9A3412' },
  Cancelado: { fondo: 'FFFEE2E2', texto: 'FF991B1B' },
};

function agregarHoja(
  workbook: ExcelJS.Workbook,
  { sheetName, titulo, subtitulo, columnas, filas, columnaEstado, totales }: HojaExcel,
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: HEADER_ROW_INDEX }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = columnas.map((c) => ({ width: c.width }));
  const lastCol = columnas.length;

  sheet.mergeCells(1, 1, 1, lastCol);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = titulo;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, lastCol);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitulo;
  subtitleCell.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
  sheet.getRow(2).height = 18;

  const headerRow = sheet.getRow(HEADER_ROW_INDEX);
  headerRow.values = columnas.map((c) => c.header);
  headerRow.height = 22;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: columnas[colNumber - 1].align ?? 'left',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: BRAND_BLUE_DARK } },
      bottom: { style: 'thin', color: { argb: BRAND_BLUE_DARK } },
    };
  });

  filas.forEach((valores, i) => {
    const row = sheet.getRow(HEADER_ROW_INDEX + 1 + i);
    row.values = valores.map((v) => (v === null || v === '' ? '—' : v));
    for (let c = 1; c <= lastCol; c++) {
      const cell = row.getCell(c);
      const col = columnas[c - 1];
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      cell.alignment = { vertical: 'middle', horizontal: col.align ?? 'left', wrapText: true };
      if (col.numFmt && typeof cell.value === 'number') cell.numFmt = col.numFmt;
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      }
      if (col.colorTexto && cell.value !== '—' && cell.value !== '') {
        cell.font = { bold: true, color: { argb: col.colorTexto } };
      }
    }

    if (columnaEstado !== undefined) {
      const cell = row.getCell(columnaEstado + 1);
      const color = COLORES_ESTADO[String(cell.value)];
      if (color) {
        cell.font = { bold: true, color: { argb: color.texto } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.fondo } };
      }
    }
  });

  const ultimaFila = HEADER_ROW_INDEX + filas.length;

  if (totales) {
    const row = sheet.getRow(ultimaFila + 1);
    row.values = totales.map((v) => (v === null ? '' : v));
    row.height = 22;
    for (let c = 1; c <= lastCol; c++) {
      const cell = row.getCell(c);
      const col = columnas[c - 1];
      cell.font = { bold: true, color: { argb: BRAND_BLUE_DARK } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      cell.alignment = { vertical: 'middle', horizontal: col.align ?? 'left' };
      cell.border = {
        top: { style: 'medium', color: { argb: BRAND_BLUE } },
        bottom: { style: 'thin', color: { argb: BRAND_BLUE_DARK } },
      };
      if (col.numFmt && typeof cell.value === 'number') cell.numFmt = col.numFmt;
    }
  }
}

export async function exportarExcelEstilizado(hojas: HojaExcel[], filename: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Velsat';
  workbook.created = new Date();
  hojas.forEach((h) => agregarHoja(workbook, h));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
