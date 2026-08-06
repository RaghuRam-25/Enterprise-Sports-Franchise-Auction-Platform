const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/**
 * Normalizes image URLs across localhost, production deployments,
 * relative paths, static /uploads/, cloud/CDN URLs, and base64 data URIs.
 * 
 * @param {string} url - Raw image path or URL from backend/player/team model
 * @param {string} fallback - Fallback image path if url is empty/invalid
 * @returns {string} Fully resolved, renderable image URL
 */
export const getImageUrl = (url, fallback = '/placeholder-player.png') => {
  if (!url || typeof url !== 'string') return fallback;

  // Trim whitespace
  const trimmed = url.trim();

  if (!trimmed) return fallback;

  // Data URLs (base64) or Blob URLs — return directly
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Full absolute URLs (http:// or https://) — return directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative path handling: ensure leading slash
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Prepend backend base URL for relative paths like /uploads/xyz.webp
  return `${BACKEND_URL}${cleanPath}`;
};

export default getImageUrl;
