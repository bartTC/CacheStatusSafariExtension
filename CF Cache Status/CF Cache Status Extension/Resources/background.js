/**
 * CF Cache Status - Background Script
 *
 * Intercepts HTTP responses to extract CDN cache headers and updates
 * the toolbar badge with the cache status (HIT/MISS/etc).
 */

// =============================================================================
// State Management
// =============================================================================

/** Stores cache header data per tab ID */
const tabData = new Map();

/** Connected popup ports */
const popupPorts = new Map();

/** Track pending navigations to detect missing headers (Safari limitation workaround) */
const pendingNavigations = new Map();

// =============================================================================
// Badge Management
// =============================================================================

function updateBadge(tabId, status) {
  const badgeTextMap = {
    'HIT': 'HIT',
    'MISS': 'MISS',
    'EXPIRED': 'EXP',
    'STALE': 'STALE',
    'REVALIDATED': 'REV',
    'BYPASS': 'BYP',
    'DYNAMIC': 'DYN',
    'REFRESH': 'REF',
    'ERROR': 'ERR'
  };
  const badgeText = status ? (badgeTextMap[status.toUpperCase()] || status) : '';
  const color = status === 'HIT' ? '#34C759' : status === 'MISS' ? '#FF3B30' : '#8E8E93';

  browser.action.setBadgeText({ text: badgeText });
  browser.action.setBadgeBackgroundColor({ color });

  try {
    browser.action.setBadgeText({ text: badgeText, tabId });
    browser.action.setBadgeBackgroundColor({ color, tabId });
  } catch (e) {
    // Per-tab badges not supported
  }
}

function clearBadge(tabId) {
  browser.action.setBadgeText({ text: '' });
  try {
    browser.action.setBadgeText({ text: '', tabId });
  } catch (e) {}
}

// =============================================================================
// Popup Communication
// =============================================================================

function notifyPopup(tabId) {
  const port = popupPorts.get(tabId);
  if (port) {
    port.postMessage({ type: 'update', data: tabData.get(tabId) || null });
  }
}

// =============================================================================
// Event Listeners
// =============================================================================

// --- Web Navigation Events ---

browser.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    tabData.delete(details.tabId);
    clearBadge(details.tabId);
    notifyPopup(details.tabId);

    // Track navigation to detect Safari limitation where webRequest events don't fire
    pendingNavigations.set(details.tabId, {
      url: details.url,
      timestamp: Date.now(),
      headersReceived: false
    });
  }
});

browser.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    const data = tabData.get(details.tabId);
    const pending = pendingNavigations.get(details.tabId);

    // Check if we never received headers (Safari limitation with external links/bookmarks)
    if (pending && !pending.headersReceived) {
      const existingData = tabData.get(details.tabId);
      if (existingData) {
        existingData.noHeaders = true;
        existingData.url = details.url;
      } else {
        tabData.set(details.tabId, {
          url: details.url,
          headers: {},
          status: null,
          cdn: null,
          timestamp: Date.now(),
          noHeaders: true
        });
      }

      // Show reload badge
      browser.action.setBadgeText({ text: 'RLD' });
      browser.action.setBadgeBackgroundColor({ color: '#8E8E93' });
      try {
        browser.action.setBadgeText({ text: 'RLD', tabId: details.tabId });
        browser.action.setBadgeBackgroundColor({ color: '#8E8E93', tabId: details.tabId });
      } catch (e) {}

      notifyPopup(details.tabId);
    }

    // Update URL if we have data (handles redirects)
    if (data && data.url !== details.url) {
      data.url = details.url;
    }

    pendingNavigations.delete(details.tabId);
  }
});

// --- Web Request Events ---

/**
 * Process response headers from a main frame request.
 * Called by both onHeadersReceived and onResponseStarted (Safari fallback).
 */
function processMainFrameHeaders(details) {
  // Mark navigation as having received headers (for Safari limitation detection)
  const pendingNav = pendingNavigations.get(details.tabId);
  if (pendingNav) {
    pendingNav.headersReceived = true;
  }

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

  // Store data
  tabData.set(details.tabId, {
    url: details.url,
    headers,
    status,
    cdn,
    timestamp: Date.now()
  });

  updateBadge(details.tabId, status);
  notifyPopup(details.tabId);
}

browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type === 'main_frame' && details.frameId === 0) {
      processMainFrameHeaders(details);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Safari fallback: onResponseStarted sometimes fires when onHeadersReceived doesn't
browser.webRequest.onResponseStarted.addListener(
  (details) => {
    if (details.type !== 'main_frame' || details.frameId !== 0) {
      return;
    }

    const pendingNav = pendingNavigations.get(details.tabId);
    if (pendingNav && !pendingNav.headersReceived) {
      processMainFrameHeaders(details);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// --- Tab Events ---

browser.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
  popupPorts.delete(tabId);
  pendingNavigations.delete(tabId);
});

browser.tabs.onActivated.addListener((activeInfo) => {
  const data = tabData.get(activeInfo.tabId);
  if (data) {
    updateBadge(activeInfo.tabId, data.status);
  } else {
    clearBadge(activeInfo.tabId);
  }
});

// --- Window Events ---

browser.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === browser.windows.WINDOW_ID_NONE) return;

  try {
    const tabs = await browser.tabs.query({ active: true, windowId });
    if (tabs?.[0]) {
      const data = tabData.get(tabs[0].id);
      if (data) {
        updateBadge(tabs[0].id, data.status);
      } else {
        clearBadge(tabs[0].id);
      }
    }
  } catch (e) {
    // Ignore errors during window switching
  }
});

// --- Message Handling ---

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
    notifyPopup(sender.tab.id);
  }

  return true;
});

// --- Popup Port Connection ---

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== 'popup') return;

  port.onMessage.addListener((msg) => {
    if (msg.type === 'subscribe' && msg.tabId) {
      popupPorts.set(msg.tabId, port);
      port.postMessage({ type: 'update', data: tabData.get(msg.tabId) || null });
    }
  });

  port.onDisconnect.addListener(() => {
    for (const [tabId, p] of popupPorts) {
      if (p === port) {
        popupPorts.delete(tabId);
        break;
      }
    }
  });
});
