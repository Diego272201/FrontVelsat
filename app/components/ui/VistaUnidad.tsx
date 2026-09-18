import React from 'react';
import Image from 'next/image';

interface Props {
  item: number;
  deviceId: string;
  kilometros: number;
  percentage?: string | number;
  dailyAvg?: string | number;
}

export default function VistaUnidad({
  item,
  deviceId,
  kilometros,
  percentage = '100',
  dailyAvg = '0.0',
}: Props) {
  const percentNum = parseFloat(String(percentage)) || 0;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">
            ITEM {item}
          </span>
          <span className="text-[13.5px] font-bold text-gray-900 tracking-tight">
            {deviceId.toUpperCase()}
          </span>
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50/70 px-2.5 py-0.5 text-[10px] font-semibold text-[#113EB9] whitespace-nowrap">
          {percentage}% del total
        </span>
      </div>

      <div className="my-3.5 flex h-28 w-full items-center justify-center rounded-xl bg-slate-100/70 p-2">
        <Image
          src="/UnidadK.webp"
          alt={deviceId}
          width={120}
          height={85}
          className="max-h-24 w-auto object-contain"
        />
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[22px] font-black tracking-tight text-[#0B192C]">
            {kilometros.toFixed(2)}
          </span>
          <span className="text-[11.5px] font-semibold text-gray-500">
            km recorridos
          </span>
        </div>

        <div className="mt-2 mb-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-[#113EB9]"
            style={{ width: `${Math.min(100, Math.max(3, percentNum))}%` }}
          />
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-left flex items-center justify-between">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
            PROMEDIO DIARIO
          </span>
          <span className="text-[12.5px] font-bold text-gray-800">
            {dailyAvg} km
          </span>
        </div>
      </div>
    </div>
  );
}
