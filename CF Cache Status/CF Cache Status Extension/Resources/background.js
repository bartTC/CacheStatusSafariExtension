/**
 * CF Cache Status - Background Script
 *
 * Intercepts HTTP responses to extract CDN cache headers and updates
 * the toolbar badge with the cache status (HIT/MISS/etc).
 *
 * Supports: Cloudflare, CloudFront, Fastly, Akamai, Bunny CDN, Varnish
 */

// =============================================================================
// State Management
// =============================================================================

/** Stores cache header data per tab ID */
const tabData = new Map();

/** Tracks tabs with pending navigations to capture only the first main request */
const pendingNavigations = new Set();

// =============================================================================
// Configuration
// =============================================================================

/** HTTP headers to capture from responses */
const TRACKED_HEADERS = [
  // Cloudflare
  'cf-cache-status', 'cf-ray', 'cf-pop',
  // CloudFront
  'x-amz-cf-id', 'x-amz-cf-pop',
  // Fastly
  'x-served-by', 'x-cache-hits', 'x-timer',
  // Akamai
  'x-akamai-request-id',
  // Bunny CDN
  'cdn-cache', 'cdn-pullzone', 'cdn-requestid',
  // Generic (CloudFront, Fastly, Akamai, Varnish, KeyCDN, etc.)
  'x-cache', 'x-cache-status', 'x-varnish', 'x-edge-location', 'via',
  // Standard cache headers
  'age', 'cache-control', 'expires', 'etag', 'last-modified', 'vary', 'pragma',
  // Response metadata
  'server', 'content-type'
];

/** Badge colors for each cache status */
const STATUS_COLORS = {
  'HIT':         { badge: '#22c55e', text: '#fff' },  // Green
  'MISS':        { badge: '#ef4444', text: '#fff' },  // Red
  'EXPIRED':     { badge: '#eab308', text: '#000' },  // Yellow
  'STALE':       { badge: '#eab308', text: '#000' },  // Yellow
  'REVALIDATED': { badge: '#eab308', text: '#000' },  // Yellow
  'REFRESH':     { badge: '#eab308', text: '#000' },  // Yellow
  'BYPASS':      { badge: '#6b7280', text: '#fff' },  // Gray
  'DYNAMIC':     { badge: '#6b7280', text: '#fff' },  // Gray
  'ERROR':       { badge: '#ef4444', text: '#fff' },  // Red
  'NONE':        { badge: '#6b7280', text: '#fff' }   // Gray (no CDN)
};

// =============================================================================
// CDN Detection
// =============================================================================

/**
 * Detects the CDN provider based on response headers.
 * @param {Object} headers - Lowercase header name to value mapping
 * @returns {string|null} CDN identifier or null if not detected
 */
function detectCDN(headers) {
  if (headers['cf-cache-status'] || headers['cf-ray']) return 'cloudflare';
  if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop']) return 'cloudfront';
  if (headers['x-served-by'] || headers['x-timer']) return 'fastly';
  if (headers['x-akamai-request-id']) return 'akamai';
  if (headers['cdn-cache'] || headers['cdn-pullzone']) return 'bunny';
  if (headers['x-varnish']) return 'varnish';

  // Check x-cache with via header for additional hints
  if (headers['x-cache']) {
    const via = (headers['via'] || '').toLowerCase();
    if (via.includes('cloudfront')) return 'cloudfront';
    if (via.includes('varnish')) return 'varnish';
    if (via.includes('akamai')) return 'akamai';
    return 'cdn';  // Generic CDN
  }

  return null;
}

/**
 * Parses cache status from headers based on the detected CDN.
 * @param {Object} headers - Lowercase header name to value mapping
 * @param {string} cdn - CDN identifier from detectCDN()
 * @returns {string|null} Normalized cache status (HIT, MISS, etc.) or null
 */
function parseCacheStatus(headers, cdn) {
  // Cloudflare uses its own header
  if (cdn === 'cloudflare') {
    return headers['cf-cache-status']?.toUpperCase() || null;
  }

  // Bunny CDN uses cdn-cache header
  if (cdn === 'bunny') {
    const status = headers['cdn-cache'];
    if (status) {
      const lower = status.toLowerCase();
      if (lower.includes('hit')) return 'HIT';
      if (lower.includes('miss')) return 'MISS';
    }
    return null;
  }

  // Most CDNs use x-cache header (CloudFront, Fastly, Akamai, Varnish, etc.)
  const xCache = headers['x-cache'] || headers['x-cache-status'];
  if (xCache) {
    const lower = xCache.toLowerCase();
    if (lower.includes('hit')) return 'HIT';
    if (lower.includes('miss')) return 'MISS';
    if (lower.includes('refresh')) return 'REFRESH';
    if (lower.includes('error')) return 'ERROR';
    if (lower.includes('pass')) return 'BYPASS';
    if (lower.includes('expired')) return 'EXPIRED';
  }

  return null;
}

// =============================================================================
// Badge Management
// =============================================================================

/**
 * Updates the toolbar badge text and color for a tab.
 * Sets both globally and per-tab (Safari has inconsistent per-tab support).
 * @param {number} tabId - Browser tab ID
 * @param {string|null} status - Cache status (HIT, MISS, etc.)
 * @param {string|null} cdn - CDN identifier
 */
function updateBadge(tabId, status, cdn) {
  const displayStatus = status || 'NONE';
  const colors = STATUS_COLORS[displayStatus] || STATUS_COLORS['NONE'];

  // Map status to shortened badge text
  const badgeTextMap = {
    'HIT': 'HIT', 'MISS': 'MISS', 'EXPIRED': 'EXP', 'STALE': 'STL',
    'REVALIDATED': 'REV', 'BYPASS': 'BYP', 'DYNAMIC': 'DYN',
    'REFRESH': 'REF', 'ERROR': 'ERR'
  };
  const badgeText = status ? (badgeTextMap[status] || status.substring(0, 3)) : '';

  // Set badge globally (Safari doesn't always support per-tab badges)
  browser.action.setBadgeText({ text: badgeText });
  browser.action.setBadgeBackgroundColor({ color: colors.badge });

  // Also try per-tab for browsers that support it
  try {
    browser.action.setBadgeText({ text: badgeText, tabId });
    browser.action.setBadgeBackgroundColor({ color: colors.badge, tabId });
  } catch (e) {
    // Per-tab badges not supported
  }
}

/**
 * Clears the badge, setting it globally and per-tab.
 * @param {number} tabId - Browser tab ID
 */
function clearBadge(tabId) {
  browser.action.setBadgeText({ text: '' });
  try {
    browser.action.setBadgeText({ text: '', tabId });
  } catch (e) {
    // Per-tab badges not supported
  }
}

// =============================================================================
// Event Listeners
// =============================================================================

// Track navigation start to capture only the first main document request
browser.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {  // Main frame only
    pendingNavigations.add(details.tabId);
    tabData.delete(details.tabId);  // Clear stale data
  }
});

// Update URL after navigation completes (handles redirects)
browser.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {  // Main frame only
    const data = tabData.get(details.tabId);
    if (data && data.url !== details.url) {
      data.url = details.url;  // Update to final URL after redirects
    }
  }
});

// Capture response headers for main document requests
browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Only process main frame requests we're expecting
    if (details.type !== 'main_frame' || details.frameId !== 0) return;
    if (!pendingNavigations.has(details.tabId)) return;

    pendingNavigations.delete(details.tabId);

    // Extract tracked headers
    const headers = {};
    for (const header of details.responseHeaders || []) {
      const name = header.name.toLowerCase();
      if (TRACKED_HEADERS.includes(name)) {
        headers[name] = header.value;
      }
    }

    // Detect CDN and parse status
    const cdn = detectCDN(headers);
    const status = parseCacheStatus(headers, cdn);

    // Store data for popup
    tabData.set(details.tabId, {
      url: details.url,
      headers,
      status,
      cdn,
      timestamp: Date.now()
    });

    updateBadge(details.tabId, status, cdn);
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Clean up data when tab closes
browser.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
  pendingNavigations.delete(tabId);
});

// Update badge when switching tabs
browser.tabs.onActivated.addListener((activeInfo) => {
  const data = tabData.get(activeInfo.tabId);
  if (data) {
    updateBadge(activeInfo.tabId, data.status, data.cdn);
  } else {
    clearBadge(activeInfo.tabId);
  }
});

// Update badge when window focus changes
browser.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === browser.windows.WINDOW_ID_NONE) return;

  try {
    const tabs = await browser.tabs.query({ active: true, windowId });
    if (tabs?.[0]) {
      const data = tabData.get(tabs[0].id);
      if (data) {
        updateBadge(tabs[0].id, data.status, data.cdn);
      } else {
        clearBadge(tabs[0].id);
      }
    }
  } catch (e) {
    // Ignore errors during window switching
  }
});

// Handle messages from popup and content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getTabData') {
    sendResponse(tabData.get(message.tabId) || null);
  }

  // Handle performance data from content script
  if (message.type === 'performanceData' && sender.tab) {
    const existing = tabData.get(sender.tab.id);
    if (existing) {
      existing.performance = message.metrics;
    } else {
      // Store performance data even if no cache headers yet
      tabData.set(sender.tab.id, {
        url: sender.tab.url,
        headers: {},
        status: null,
        cdn: null,
        performance: message.metrics,
        timestamp: Date.now()
      });
    }
  }

  return true;
});
