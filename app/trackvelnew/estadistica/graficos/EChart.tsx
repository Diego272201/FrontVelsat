'use client';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, CustomChart, LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  VisualMapComponent,
  LegendComponent,
  CanvasRenderer,
]);

export const TIME_GROUP = 'graficos-tiempo';

interface EChartProps {
  option: echarts.EChartsCoreOption;
  height: number;
  group?: string;
  brushZoom?: boolean;
}

export default function EChart({ option, height, group, brushZoom }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Sin Ctrl la rueda no llega al gráfico, así la página se desplaza normal; con Ctrl hace zoom
    const passWheelToPage = (e: WheelEvent) => {
      if (!e.ctrlKey) e.stopPropagation();
    };
    container.addEventListener('wheel', passWheelToPage, { capture: true });

    const chart = echarts.init(container, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    if (group) {
      chart.group = group;
      echarts.connect(group);
    }

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);

    return () => {
      container.removeEventListener('wheel', passWheelToPage, { capture: true });
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [group]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, { notMerge: true });
    if (brushZoom) {
      // Deja activo "arrastrar para hacer zoom", como en el selector de rango de la referencia
      chart.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'dataZoomSelect',
        dataZoomSelectActive: true,
      });
    }
  }, [option, brushZoom]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
