import { useEffect, useState } from 'react';

export interface ThemeVariant {
  palette: any;
  trailColors?: Record<string, string>;
  componentTokens?: Record<string, string>;
}

export interface DesignThemeConfig {
  id: string;
  name: string;
  version?: number;
  variants: {
    light: ThemeVariant;
    dark: ThemeVariant;
  };
}

export function useDesignTheme() {
  const [themeConfig, setThemeConfig] = useState<DesignThemeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchTheme() {
      setLoading(true);
      try {
        const res = await fetch('/api/wp-design.js');
        if (!res.ok) throw new Error(`Failed to fetch theme: ${res.status}`);
        const json = await res.json();
        if (isMounted) {
          setThemeConfig(json as DesignThemeConfig);
          setError(null);
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e?.message || 'Failed to fetch theme');
          setThemeConfig(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  return { themeConfig, loading, error };
}


