import { sanitizeHTML, sanitizeAdvanced} from './utils.js';

/**
 * Test vectors for XSS vulnerabilities
 */
const XSS_TEST_VECTORS = [
  // Basic XSS vectors
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<a href="javascript:alert(\'XSS\')">Click me</a>',
  '<div onmouseover="alert(\'XSS\')">Hover over me</div>',
  // HTML5 vectors
  '<svg onload="alert(\'XSS\')"/>',
  '<body onload="alert(\'XSS\')">',
  // Encoding bypasses
  '"><script>alert("XSS")</script>',
  '&#x3C;script&#x3E;alert(\'XSS\')&#x3C;/script&#x3E;',
  // Event handlers
  '<input onfocus="alert(\'XSS\')" autofocus>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>'
];

/**
 * Tests sanitization by comparing raw input with sanitized output
 * @returns {Object} Results of sanitization tests
 */
function testSanitization() {
  const results = [];
  
  XSS_TEST_VECTORS.forEach(vector => {
    // Test both basic and advanced sanitization
    const basicSanitized = sanitizeHTML(vector);
    const advancedSanitized = sanitizeAdvanced(vector);
    
    const isBasicSafe = !containsExecutableCode(basicSanitized);
    const isAdvancedSafe = !containsExecutableCode(advancedSanitized);
    
    results.push({
      original: vector,
      sanitized: basicSanitized,
      advancedSanitized: advancedSanitized,
      basicSafe: isBasicSafe,
      advancedSafe: isAdvancedSafe
    });
  });
  
  return results;
}

/**
 * Simple check if a string might contain executable code
 * Note: This is not comprehensive - server validation is still essential
 */
function containsExecutableCode(str) {
  // Check for common script tags and event handlers that weren't sanitized
  const dangerPatterns = [
    /<script>/i, 
    /javascript:/i, 
    /on\w+=/i, // onclick, onload, etc.
    /<iframe/i
  ];
  
  return dangerPatterns.some(pattern => pattern.test(str));
}

/**
 * Displays test results in a table on the page
 */
function displayTestResults() {
  const results = testSanitization();
  const container = document.getElementById('sanitization-test-results');
  
  if (!container) {
    console.error('Results container not found');
    return;
  }
  
  let html = '<table class="test-results"><thead><tr><th>Test Vector</th><th>Basic Sanitized</th><th>Basic</th><th>Advanced Sanitized</th><th>Advanced</th></tr></thead><tbody>';
  
  results.forEach(result => {
    const basicStatusClass = result.basicSafe ? 'pass' : 'fail';
    const advancedStatusClass = result.advancedSafe ? 'pass' : 'fail';
    
    html += `
      <tr>
        <td><code>${sanitizeHTML(result.original)}</code></td>
        <td><code>${sanitizeHTML(result.sanitized)}</code></td>
        <td class="${basicStatusClass}">${result.basicSafe ? 'PASS' : 'FAIL'}</td>
        <td><code>${sanitizeHTML(result.advancedSanitized)}</code></td>
        <td class="${advancedStatusClass}">${result.advancedSafe ? 'PASS' : 'FAIL'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

// Export functions for use in test page
export { testSanitization, displayTestResults };
