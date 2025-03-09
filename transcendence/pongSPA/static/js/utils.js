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
