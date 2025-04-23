'use client';
export const dynamic = 'force-dynamic';

import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div className="mainPruebas">{children}</div>
    </div>
  );
}
