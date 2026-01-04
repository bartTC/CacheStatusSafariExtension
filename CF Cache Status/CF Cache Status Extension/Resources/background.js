/**
 * CF Cache Status - Background Script
 *
 * Intercepts HTTP responses to extract CDN cache headers and updates
 * the toolbar badge with the cache status (HIT/MISS/etc).
 */

// Import shared constants (loaded via manifest.json)
// Uses: TRACKED_HEADERS, STATUS_COLORS, detectCDN, parseCacheStatus

// =============================================================================
// State Management
// =============================================================================

/** Stores cache header data per tab ID */
const tabData = new Map();

/** Tracks tabs with pending navigations to capture only the first main request */
const pendingNavigations = new Set();

// =============================================================================
// Badge Management
// =============================================================================

/**
 * Updates the toolbar badge text and color for a tab.
 * @param {number} tabId - Browser tab ID
 * @param {string|null} status - Cache status (HIT, MISS, etc.)
 * @param {string|null} cdn - CDN identifier
 */
function updateBadge(tabId, status, cdn) {
  const displayStatus = status || 'NONE';
  const colors = STATUS_COLORS[displayStatus] || STATUS_COLORS['NONE'];

  const badgeTextMap = {
    'HIT': 'HIT', 'MISS': 'MISS', 'EXPIRED': 'EXP', 'STALE': 'STL',
    'REVALIDATED': 'REV', 'BYPASS': 'BYP', 'DYNAMIC': 'DYN',
    'REFRESH': 'REF', 'ERROR': 'ERR'
  };
  const badgeText = status ? (badgeTextMap[status] || status.substring(0, 3)) : '';

  browser.action.setBadgeText({ text: badgeText });
  browser.action.setBadgeBackgroundColor({ color: colors.badge });

  try {
    browser.action.setBadgeText({ text: badgeText, tabId });
    browser.action.setBadgeBackgroundColor({ color: colors.badge, tabId });
  } catch (e) {
    // Per-tab badges not supported
  }
}

/**
 * Clears the badge for a tab.
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
  if (details.frameId === 0) {
    pendingNavigations.add(details.tabId);
    tabData.delete(details.tabId);
  }
});

// Update URL after navigation completes (handles redirects)
browser.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    const data = tabData.get(details.tabId);
    if (data && data.url !== details.url) {
      data.url = details.url;
    }
  }
});

// Capture response headers for main document requests
browser.webRequest.onHeadersReceived.addListener(
  (details) => {
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

    // Detect CDN and parse status using shared functions
    const cdn = detectCDN(headers);
    const status = parseCacheStatus(headers, cdn);

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

  if (message.type === 'performanceData' && sender.tab) {
    const existing = tabData.get(sender.tab.id);
    if (existing) {
      existing.performance = message.metrics;
    } else {
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
