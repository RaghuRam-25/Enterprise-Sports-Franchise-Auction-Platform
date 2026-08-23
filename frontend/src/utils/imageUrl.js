const getBackendBaseUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

/**
 * Normalizes image URLs across localhost, production deployments,
 * relative paths, static /uploads/, cloud/CDN URLs, and base64 data URIs.
 * 
 * Supports raw string paths as well as player/user data objects
 * (extracting imageUrl, photo, profilePhoto, avatar, photoUrl, logoUrl, logo).
 * 
 * @param {string|object} input - Image path, URL, or data object containing image fields
 * @param {string} fallback - Fallback image path if URL is empty/invalid
 * @returns {string} Fully resolved, renderable image URL
 */
export const getImageUrl = (input, fallback = '/placeholder-player.png') => {
  if (!input) return fallback;

  let url = input;
  if (typeof input === 'object') {
    url = input.imageUrl || input.photo || input.profilePhoto || input.avatar || input.photoUrl || input.logoUrl || input.logo || '';
  }

  if (!url || typeof url !== 'string') return fallback;

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

  const baseUrl = getBackendBaseUrl();
  return `${baseUrl}${cleanPath}`;
};

/**
 * Specialized helper for player objects
 */
export const getPlayerImageUrl = (player, fallback) => getImageUrl(player, fallback);

export default getImageUrl;
