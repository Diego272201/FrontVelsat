import * as echarts from 'echarts/core';
import type { GeneralPoint, KmItem, RoutePoint, SpeedPoint, StopItem } from './data';

export interface TimeRange {
  min: number;
  max: number;
}

const FONT = "'IBM Plex Sans', 'Segoe UI', sans-serif";
const BLUE = '#113EB9';
const LINE_BLUE = '#1f77d4';
const ORANGE = '#FB7B0F';
const AXIS_TEXT = '#64748b';
const GRID_LINE = '#eef1f5';

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateTime(ms: number, withSeconds = true): string {
  const d = new Date(ms);
  const base = `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getSeconds())}` : base;
}

export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

const tooltipBase = {
  trigger: 'axis' as const,
  backgroundColor: '#1f2937',
  borderWidth: 0,
  padding: [6, 10],
  textStyle: { color: '#fff', fontFamily: FONT, fontSize: 12 },
  axisPointer: { type: 'line' as const, lineStyle: { color: '#94a3b8', type: 'dashed' as const } },
};

function timeXAxis(range: TimeRange) {
  return {
    type: 'time' as const,
    min: range.min,
    max: range.max,
    axisLine: { lineStyle: { color: '#cbd5e1' } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: {
      color: AXIS_TEXT,
      fontFamily: FONT,
      fontSize: 11,
      hideOverlap: true,
      formatter: {
        year: '{yyyy}',
        month: '{dd}/{MM}',
        day: '{dd}/{MM}',
        hour: '{HH}:{mm}',
        minute: '{HH}:{mm}',
        second: '{HH}:{mm}:{ss}',
        millisecond: '{HH}:{mm}:{ss}',
        none: '{HH}:{mm}',
      },
    },
  };
}

function valueYAxis(name: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'value' as const,
    name,
    nameTextStyle: { color: AXIS_TEXT, fontFamily: FONT, fontSize: 11, align: 'left' as const },
    axisLabel: { color: AXIS_TEXT, fontFamily: FONT, fontSize: 11 },
    splitLine: { lineStyle: { color: GRID_LINE } },
    ...extra,
  };
}

const zoomToolbox = {
  right: 10,
  top: 0,
  itemSize: 14,
  iconStyle: { borderColor: '#64748b' },
  emphasis: { iconStyle: { borderColor: BLUE } },
  feature: {
    dataZoom: {
      yAxisIndex: 'none' as const,
      title: { zoom: 'Arrastra para hacer zoom', back: 'Deshacer zoom' },
    },
    restore: { title: 'Ver todo el rango' },
  },
};

// La rueda sola desplaza la página; Ctrl + rueda hace zoom
const insideZoom = {
  type: 'inside' as const,
  xAxisIndex: 0,
  filterMode: 'none' as const,
  zoomOnMouseWheel: 'ctrl' as const,
  moveOnMouseWheel: false,
  preventDefaultMouseMove: false,
};
const timeGrid = { left: 52, right: 60, top: 52, bottom: 30 };

function speedMarkLine(limit: number) {
  return {
    silent: true,
    symbol: 'none',
    lineStyle: { color: '#dc2626', type: 'dashed' as const, width: 1 },
    label: {
      formatter: `Límite ${limit} km/h`,
      color: '#dc2626',
      fontFamily: FONT,
      fontSize: 10,
      position: 'insideStartTop' as const,
    },
    data: [{ yAxis: limit }],
  };
}

export function navigatorOption(points: SpeedPoint[], range: TimeRange) {
  return {
    animation: false,
    // Toolbox invisible: necesaria para que el "arrastrar para zoom" de los otros gráficos también mueva esta ventana
    toolbox: { ...zoomToolbox, itemSize: 0, itemGap: 0, showTitle: false },
    grid: { left: 52, right: 60, top: 0, height: 1 },
    xAxis: { ...timeXAxis(range), show: false },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data: points.map((p) => [p.t, p.speed]),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { opacity: 0 },
      },
    ],
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none',
        left: 52,
        right: 60,
        top: 4,
        height: 46,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        fillerColor: 'rgba(17, 62, 185, 0.12)',
        handleStyle: { color: '#fff', borderColor: BLUE },
        moveHandleStyle: { color: BLUE, opacity: 0.6 },
        dataBackground: {
          lineStyle: { color: '#64748b', width: 0.8 },
          areaStyle: { color: 'rgba(100,116,139,0.08)' },
        },
        selectedDataBackground: {
          lineStyle: { color: BLUE, width: 0.8 },
          areaStyle: { color: 'rgba(17,62,185,0.1)' },
        },
        textStyle: { color: AXIS_TEXT, fontFamily: FONT, fontSize: 10 },
        labelFormatter: (value: number) => formatDateTime(value, false),
      },
    ],
  };
}

export function speedOption(points: SpeedPoint[], range: TimeRange, limit: number) {
  return {
    animation: false,
    textStyle: { fontFamily: FONT },
    grid: timeGrid,
    toolbox: zoomToolbox,
    tooltip: {
      ...tooltipBase,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        if (!p) return '';
        return `${formatDateTime(p.value[0])}&nbsp;&nbsp;<b>${Math.round(p.value[1])} km/h</b>`;
      },
    },
    xAxis: timeXAxis(range),
    yAxis: valueYAxis('km/h', { min: 0 }),
    dataZoom: [insideZoom],
    series: [
      {
        name: 'Velocidad',
        type: 'line',
        data: points.map((p) => [p.t, p.speed]),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.2, color: LINE_BLUE },
        itemStyle: { color: LINE_BLUE },
        areaStyle: { color: 'rgba(31,119,212,0.08)' },
        markLine: speedMarkLine(limit),
      },
    ],
  };
}

export function generalOption(points: GeneralPoint[], range: TimeRange) {
  return {
    animation: false,
    textStyle: { fontFamily: FONT },
    grid: timeGrid,
    toolbox: zoomToolbox,
    legend: {
      top: 2,
      left: 52,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: AXIS_TEXT, fontFamily: FONT, fontSize: 11 },
      data: ['Velocidad', 'Odómetro'],
      formatter: (name: string) => (name === 'Odómetro' ? 'Odómetro (km, eje derecho)' : 'Velocidad (km/h)'),
    },
    tooltip: {
      ...tooltipBase,
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        if (!list.length) return '';
        const lines = list.map((p: any) =>
          p.seriesName === 'Odómetro'
            ? `${p.marker}Odómetro: <b>${Number(p.value[1]).toLocaleString('en-US', { maximumFractionDigits: 1 })} km</b>`
            : `${p.marker}Velocidad: <b>${Math.round(p.value[1])} km/h</b>`,
        );
        return `${formatDateTime(list[0].value[0])}<br/>${lines.join('<br/>')}`;
      },
    },
    xAxis: timeXAxis(range),
    yAxis: [
      valueYAxis('km/h', { min: 0 }),
      valueYAxis('', {
        scale: true,
        position: 'right',
        splitLine: { show: false },
        nameTextStyle: { color: AXIS_TEXT, fontFamily: FONT, fontSize: 11, align: 'right' },
      }),
    ],
    dataZoom: [insideZoom],
    series: [
      {
        name: 'Velocidad',
        type: 'line',
        data: points.map((p) => [p.t, p.speed]),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.1, color: LINE_BLUE },
        itemStyle: { color: LINE_BLUE },
        areaStyle: { color: 'rgba(31,119,212,0.07)' },
      },
      {
        name: 'Odómetro',
        type: 'line',
        yAxisIndex: 1,
        data: points.filter((p) => p.odometer > 0).map((p) => [p.t, p.odometer]),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 2, color: ORANGE },
        itemStyle: { color: ORANGE },
      },
    ],
  };
}

export const SPEED_BANDS = [
  { lt: 1, color: '#FF0000', label: 'Detenido' },
  { gte: 1, lte: 20, color: '#f69300', label: '1 – 20 km/h' },
  { gt: 20, lte: 45, color: '#319602', label: '21 – 45 km/h' },
  { gt: 45, color: '#0066FF', label: '> 45 km/h' },
];

export function routeOption(points: RoutePoint[], range: TimeRange) {
  return {
    animation: false,
    textStyle: { fontFamily: FONT },
    grid: timeGrid,
    toolbox: zoomToolbox,
    visualMap: {
      show: false,
      type: 'piecewise',
      seriesIndex: 0,
      dimension: 1,
      pieces: SPEED_BANDS.map(({ label: _label, ...piece }) => piece),
    },
    tooltip: {
      ...tooltipBase,
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        if (!list.length) return '';
        const speed = list.find((p: any) => p.seriesIndex === 0);
        const dist = list.find((p: any) => p.seriesIndex === 1);
        return [
          formatDateTime(list[0].value[0]),
          speed ? `Velocidad: <b>${Math.round(speed.value[1])} km/h</b>` : '',
          dist ? `Recorrido: <b>${Number(dist.value[1]).toFixed(1)} km</b>` : '',
        ]
          .filter(Boolean)
          .join('<br/>');
      },
    },
    xAxis: timeXAxis(range),
    yAxis: [
      valueYAxis('km/h', { min: 0 }),
      valueYAxis('', {
        min: 0,
        position: 'right',
        splitLine: { show: false },
        nameTextStyle: { color: AXIS_TEXT, fontFamily: FONT, fontSize: 11, align: 'right' },
      }),
    ],
    dataZoom: [insideZoom],
    series: [
      {
        name: 'Velocidad',
        type: 'line',
        data: points.map((p) => [p.t, p.speed]),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.3 },
      },
      {
        name: 'Distancia',
        type: 'line',
        yAxisIndex: 1,
        data: points.map((p) => [p.t, p.distanceKm]),
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.5, color: '#334155', type: 'dashed' },
        itemStyle: { color: '#334155' },
      },
    ],
  };
}

function stopColor(minutes: number): string {
  if (minutes >= 60) return '#dc2626';
  if (minutes >= 15) return '#FB7B0F';
  return '#f59e0b';
}

export function stopsOption(stops: StopItem[], range: TimeRange) {
  return {
    animation: false,
    textStyle: { fontFamily: FONT },
    grid: timeGrid,
    toolbox: zoomToolbox,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1f2937',
      borderWidth: 0,
      padding: [6, 10],
      textStyle: { color: '#fff', fontFamily: FONT, fontSize: 12 },
      extraCssText: 'max-width: 320px; white-space: normal;',
      formatter: (p: any) => {
        const [start, end, minutes, address] = p.value;
        return [
          `<b>Parada de ${formatMinutes(minutes)}</b>`,
          `${formatDateTime(start, false)} → ${formatDateTime(end, false)}`,
          address ? `<span style="color:#cbd5e1">${address}</span>` : '',
        ]
          .filter(Boolean)
          .join('<br/>');
      },
    },
    xAxis: timeXAxis(range),
    yAxis: valueYAxis('minutos', { min: 0 }),
    dataZoom: [insideZoom],
    series: [
      {
        type: 'custom',
        encode: { x: [0, 1], y: 2 },
        data: stops.map((s) => [s.start, s.end, s.minutes, s.address]),
        renderItem: (params: any, api: any) => {
          const topLeft = api.coord([api.value(0), api.value(2)]);
          const bottomRight = api.coord([api.value(1), 0]);
          const rect = echarts.graphic.clipRectByRect(
            {
              x: topLeft[0],
              y: topLeft[1],
              width: Math.max(bottomRight[0] - topLeft[0], 3),
              height: bottomRight[1] - topLeft[1],
            },
            {
              x: params.coordSys.x,
              y: params.coordSys.y,
              width: params.coordSys.width,
              height: params.coordSys.height,
            },
          );
          return rect
            ? {
                type: 'rect',
                shape: { ...rect, r: [2, 2, 0, 0] },
                style: { fill: stopColor(api.value(2)) },
                emphasis: { style: { fill: '#b91c1c' } },
              }
            : null;
        },
      },
    ],
  };
}

export function kilometersOption(items: KmItem[], selectedId: string) {
  const ordered = [...items].reverse();
  const selected = selectedId.toLowerCase();
  const needsScroll = ordered.length > 14;
  return {
    animation: false,
    textStyle: { fontFamily: FONT },
    grid: { left: 96, right: needsScroll ? 56 : 40, top: 10, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1f2937',
      borderWidth: 0,
      textStyle: { color: '#fff', fontFamily: FONT, fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${String(p.name).toUpperCase()}<br/><b>${Number(p.value).toLocaleString('en-US', { maximumFractionDigits: 1 })} km</b>`;
      },
    },
    xAxis: valueYAxis('km', { nameLocation: 'end' }),
    yAxis: {
      type: 'category',
      data: ordered.map((i) => i.deviceId.toUpperCase()),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: {
        fontFamily: FONT,
        fontSize: 11,
        color: (value: string) => (value.toLowerCase() === selected ? ORANGE : '#1e3a8a'),
        fontWeight: 600,
      },
    },
    dataZoom: needsScroll
      ? [
          {
            type: 'slider',
            yAxisIndex: 0,
            right: 8,
            width: 14,
            startValue: ordered.length - 14,
            endValue: ordered.length - 1,
            zoomLock: true,
            brushSelect: false,
            showDetail: false,
            fillerColor: 'rgba(17,62,185,0.15)',
            borderColor: '#e2e8f0',
            handleSize: 0,
          },
          { type: 'inside', yAxisIndex: 0, zoomOnMouseWheel: false, moveOnMouseWheel: true },
        ]
      : [],
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: ordered.map((i) => ({
          value: Number(i.km.toFixed(1)),
          itemStyle: {
            color: i.deviceId.toLowerCase() === selected ? ORANGE : BLUE,
            borderRadius: [0, 3, 3, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          fontFamily: FONT,
          fontSize: 10.5,
          color: '#334155',
          formatter: (p: any) => Number(p.value).toLocaleString('en-US', { maximumFractionDigits: 1 }),
        },
      },
    ],
  };
}
