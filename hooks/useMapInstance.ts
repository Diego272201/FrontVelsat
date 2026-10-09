import { useCallback, useRef, useState } from 'react';

export function useMapInstance() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapLoaded(true);
    if (typeof window !== 'undefined') {
      (window as any).__trackvelMap = map;
    }
    
    // Configuraciones comunes del mapa
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).__trackvelMap === mapRef.current) {
      (window as any).__trackvelMap = null;
    }
    mapRef.current = null;
    setMapLoaded(false);
  }, []);

  return {
    mapRef,
    mapLoaded,
    onLoad,
    onUnmount,
  };
}