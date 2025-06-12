import axios from 'axios';
import { WORDPRESS_CONFIG } from '../config/wordpress';

export interface WordPressTrailConfig {
  routeId: string;
  name: string;
  color: string;
  type: 'main' | 'spur';
}

export interface WordPressConfig {
  systemName: string;
  trails: WordPressTrailConfig[];
  apiUrl: string;
}

export const wordpressConfig = {
  getWordPressUrl(): string | null {
    return localStorage.getItem('wordpress_url');
  },

  setWordPressUrl(url: string): void {
    localStorage.setItem('wordpress_url', url);
  },

  async getConfig(): Promise<WordPressConfig> {
    try {
      const response = await axios.get(`${WORDPRESS_CONFIG.url}/wp-json/trail-navigator/v1/config`);
      return response.data;
    } catch (error) {
      console.error('Error fetching WordPress configuration:', error);
      throw error;
    }
  }
};

export default wordpressConfig; 