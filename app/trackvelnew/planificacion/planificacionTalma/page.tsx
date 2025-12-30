"use client";
import React from 'react';
import Header from './Header';
import { TablaList } from './TablaList';
import { Toaster } from 'sonner';

export default function PlanificacionTalmaPage() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            <Toaster richColors />

      <Header />
      
      <div className="flex-1 overflow-y-auto">
        <TablaList />
      </div>
    </div>
  );
}