import { useState, useEffect } from 'react';
import { POI } from '../types/index';
import { getPOIs } from '../api/wordpress';

export const usePOIs = () => {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPOIs = async () => {
      try {
        console.log('Fetching POIs...');
        const data = await getPOIs();
        console.log('POIs fetched:', data);
        setPois(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching POIs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch POIs');
      } finally {
        setLoading(false);
      }
    };

    fetchPOIs();
  }, []);

  return { pois, loading, error };
};
