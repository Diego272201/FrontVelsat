'use client';
export const dynamic = 'force-dynamic';

import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
   
      <div className="mainPruebas">{children}</div>
  
  );
}
