import { useQuery } from '@tanstack/react-query';
import { wordpressConfig } from '../services/wordpressConfig';

export const useWordPressConfig = () => {
  return useQuery({
    queryKey: ['wordpress-config'],
    queryFn: wordpressConfig.getConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}; 