import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

export default function Geocercas() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapComponent />
    </div>
  );
}