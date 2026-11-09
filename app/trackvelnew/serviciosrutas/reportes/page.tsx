'use client';

import dynamic from 'next/dynamic';

const ReportesView = dynamic(() => import('./ReportesView'), { ssr: false });

export default function ReportesPage() {
  return <ReportesView />;
}
