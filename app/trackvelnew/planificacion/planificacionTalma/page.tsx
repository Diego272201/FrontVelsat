"use client";
import React, { useRef } from 'react';
import Header from './Header';
import { TablaList } from './TablaList';
import { Toaster } from 'sonner';

export default function PlanificacionTalmaPage() {
  const tablaListRef = useRef<any>(null);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Toaster richColors />

      <Header tablaListRef={tablaListRef} />
      
      <div className="flex-1 overflow-y-auto">
        <TablaList ref={tablaListRef} />
      </div>
    </div>
  );
}