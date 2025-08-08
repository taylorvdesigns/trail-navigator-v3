// WordPress configuration
export const WORDPRESS_CONFIG = {
  // Resolve from env first to allow per-deployment URL configuration
  url:
    (typeof process !== 'undefined' && (process.env.REACT_APP_WP_BASE_URL || process.env.WP_BASE_URL)) ||
    'https://srtmaps.elev8maps.com'
}; 