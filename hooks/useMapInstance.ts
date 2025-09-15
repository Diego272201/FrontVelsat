import { useCallback, useRef, useState } from 'react';

export function useMapInstance() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapLoaded(true);
    
    // Configuraciones comunes del mapa
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
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