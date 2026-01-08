/**
 * Cache Status - Content Script
 *
 * Reads Navigation Timing API data from the page context and sends
 * it to the background script for display in the popup.
 */

/**
 * Extracts performance timing metrics from the Navigation Timing API.
 * @returns {Object|null} Timing metrics or null if unavailable
 */
function getPerformanceMetrics() {
  const entries = performance.getEntriesByType('navigation');
  if (!entries || entries.length === 0) return null;

  const nav = entries[0];

  // Calculate key metrics (all in milliseconds)
  const metrics = {
    // DNS lookup time
    dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
    // TCP connection time
    tcp: Math.round(nav.connectEnd - nav.connectStart),
    // TLS handshake time (0 if not HTTPS)
    tls: nav.secureConnectionStart > 0
      ? Math.round(nav.connectEnd - nav.secureConnectionStart)
      : 0,
    // Time to First Byte (server response time)
    ttfb: Math.round(nav.responseStart - nav.requestStart),
    // Response download time
    download: Math.round(nav.responseEnd - nav.responseStart),
    // DOM interactive time (from navigation start)
    domInteractive: Math.round(nav.domInteractive - nav.startTime),
    // Full page load time (from navigation start)
    pageLoad: Math.round(nav.loadEventEnd - nav.startTime),
    // Transfer size in bytes
    transferSize: nav.transferSize || 0,
    // Encoded body size
    encodedSize: nav.encodedBodySize || 0,
    // Decoded body size
    decodedSize: nav.decodedBodySize || 0
  };

  // Filter out zero/negative values that indicate unavailable data
  // (Safari sometimes reports 0 for cross-origin redirects)
  if (metrics.ttfb <= 0) metrics.ttfb = null;
  if (metrics.pageLoad <= 0) metrics.pageLoad = null;

  return metrics;
}

/**
 * Sends performance metrics to the background script.
 */
function sendMetrics() {
  const metrics = getPerformanceMetrics();
  if (metrics) {
    browser.runtime.sendMessage({
      type: 'performanceData',
      metrics: metrics
    }).catch(() => {
      // Ignore errors (background script may not be ready)
    });
  }
}

// Wait for page load to complete, then send metrics
if (document.readyState === 'complete') {
  // Page already loaded, send after a short delay to ensure timing is finalized
  setTimeout(sendMetrics, 100);
} else {
  window.addEventListener('load', () => {
    // Wait a bit after load event for loadEventEnd to be populated
    setTimeout(sendMetrics, 100);
  });
}

// =============================================================================
// Color Scheme Detection
// =============================================================================

/**
 * Sends the current color scheme to the background script.
 * Content scripts have DOM access, so they can detect system appearance.
 */
function sendColorScheme() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  console.log('[CF Cache Status] Content script sending colorScheme, isDark:', isDark);
  browser.runtime.sendMessage({
    type: 'colorScheme',
    isDark: isDark
  }).catch((e) => {
    console.log('[CF Cache Status] Content script colorScheme error:', e.message || e);
  });
}

// Send color scheme on page load
console.log('[CF Cache Status] Content script loaded');
sendColorScheme();

// Listen for color scheme changes (user toggles dark/light mode)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  console.log('[CF Cache Status] Color scheme changed event, isDark:', e.matches);
  sendColorScheme();
});
