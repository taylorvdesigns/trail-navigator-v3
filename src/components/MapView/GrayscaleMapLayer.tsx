import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export const GrayscaleMapLayer: React.FC = () => {
  const map = useMap();
  
  React.useEffect(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        const container = layer.getContainer();
        if (container) {
          container.style.filter = 'grayscale(100%)';
        }
      }
    });

    return () => {
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          const container = layer.getContainer();
          if (container) {
            container.style.filter = 'none';
          }
        }
      });
    };
  }, [map]);

  return null;
}; 