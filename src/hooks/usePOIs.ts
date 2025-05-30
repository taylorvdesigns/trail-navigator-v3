import { useState, useEffect } from 'react';
import { POI } from '../types';
import { getPOIs } from '../api/wordpress';

export const usePOIs = () => {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPOIs = async () => {
      try {
        const data = await getPOIs();
        setPois(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch POIs');
      } finally {
        setLoading(false);
      }
    };

    fetchPOIs();
  }, []);

  return { pois, loading, error };
};
