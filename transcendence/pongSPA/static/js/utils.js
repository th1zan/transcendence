// Sanitizes HTML content to prevent XSS attacks
// Basic version: escapes HTML special characters
export function sanitizeHTML(input) {
  if (!input) return '';
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')  // < becomes &lt;
    .replace(/>/g, '&gt;')  // > becomes &gt;
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// Advanced sanitization that also neutralizes dangerous attributes and URLs

export function sanitizeAdvanced(input) {
  if (!input) return '';
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // basic HTML character escaping
  let sanitized = sanitizeHTML(input);
  
  // neutralize common attack patterns
  sanitized = sanitized
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, 'blocked:')
    // Remove data: URLs
    .replace(/data\s*:/gi, 'blocked:')
    // Neutralize event handlers (on*)
    .replace(/on\w+\s*=/gi, 'data-blocked=');
  
  return sanitized;
}

/**
 * Ensures avatar URLs are absolute, working on any device
 * @param {string} avatarPath - Relative or absolute path to avatar
 * @returns {string} - Full URL to avatar
 */
export function getAbsoluteAvatarUrl(avatarPath) {
  // If no avatar path provided, use default
  if (!avatarPath) {
    avatarPath = "/media/avatars/avatar1.png";
  }

  // If it's already a full URL, return it
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }

  // Ensure the path starts with /
  if (!avatarPath.startsWith('/')) {
    avatarPath = '/' + avatarPath;
  }

  // Build absolute URL using current origin
  const baseUrl = window.location.origin;
  return baseUrl + avatarPath;
}
