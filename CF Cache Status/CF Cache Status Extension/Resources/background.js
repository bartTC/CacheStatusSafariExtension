/**
 * CF Cache Status - Background Script
 *
 * Intercepts HTTP responses to extract CDN cache headers and updates
 * the toolbar badge with the cache status (HIT/MISS/etc).
 */

// =============================================================================
// Icon Paths
// =============================================================================

const ICONS = {
  light: {
    16: 'images/icon-light-16.png',
    32: 'images/icon-light-32.png',
    48: 'images/icon-light-48.png',
    128: 'images/icon-light-128.png'
  },
  dark: {
    16: 'images/icon-dark-16.png',
    32: 'images/icon-dark-32.png',
    48: 'images/icon-dark-48.png',
    128: 'images/icon-dark-128.png'
  },
  pendingLight: {
    16: 'images/icon-pending-light-16.png',
    32: 'images/icon-pending-light-32.png',
    48: 'images/icon-pending-light-48.png',
    128: 'images/icon-pending-light-128.png'
  },
  pendingDark: {
    16: 'images/icon-pending-dark-16.png',
    32: 'images/icon-pending-dark-32.png',
    48: 'images/icon-pending-dark-48.png',
    128: 'images/icon-pending-dark-128.png'
  }
};

/** Cached color scheme (updated by native app or popup) */
let cachedIsDark = false;

function isDarkMode() {
  return cachedIsDark;
}

// Request appearance from native app on startup
async function initializeAppearance() {
  console.log('[CF Cache Status] initializeAppearance() called');
  try {
    console.log('[CF Cache Status] Sending native message to com.cfcachestatus.CF-Cache-Status');
    const response = await browser.runtime.sendNativeMessage(
      'com.cfcachestatus.CF-Cache-Status',
      { type: 'getAppearance' }
    );
    console.log('[CF Cache Status] Native message response:', JSON.stringify(response));
    if (response && typeof response.isDark === 'boolean') {
      cachedIsDark = response.isDark;
      console.log('[CF Cache Status] Set cachedIsDark to:', cachedIsDark);
      const icon = getDefaultIcon();
      console.log('[CF Cache Status] Setting icon to:', JSON.stringify(icon));
      browser.action.setIcon({ path: icon });
    } else {
      console.log('[CF Cache Status] Invalid response format, isDark not found');
    }
  } catch (e) {
    console.error('[CF Cache Status] Native messaging error:', e.message || e);
  }
}

// Initialize appearance on extension load
console.log('[CF Cache Status] Background script loaded at', new Date().toISOString());
initializeAppearance();

function getDefaultIcon() {
  return isDarkMode() ? ICONS.dark : ICONS.light;
}

function getPendingIcon() {
  return isDarkMode() ? ICONS.pendingDark : ICONS.pendingLight;
}

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

  // Reset to default icon (respects dark/light mode)
  const icon = getDefaultIcon();
  console.log('[CF Cache Status] updateBadge called, tabId:', tabId, 'status:', status, 'cachedIsDark:', cachedIsDark, 'icon:', icon['16']);
  browser.action.setIcon({ path: icon });
  browser.action.setBadgeText({ text: badgeText });
  browser.action.setBadgeBackgroundColor({ color });

  try {
    browser.action.setIcon({ path: icon, tabId });
    browser.action.setBadgeText({ text: badgeText, tabId });
    browser.action.setBadgeBackgroundColor({ color, tabId });
  } catch (e) {
    // Per-tab badges not supported
  }
}

function clearBadge(tabId) {
  const icon = getDefaultIcon();
  browser.action.setIcon({ path: icon });
  browser.action.setBadgeText({ text: '' });
  try {
    browser.action.setIcon({ path: icon, tabId });
    browser.action.setBadgeText({ text: '', tabId });
  } catch (e) {}
}

function showPendingIcon(tabId) {
  const icon = getPendingIcon();
  browser.action.setIcon({ path: icon });
  browser.action.setBadgeText({ text: '' });
  try {
    browser.action.setIcon({ path: icon, tabId });
    browser.action.setBadgeText({ text: '', tabId });
  } catch (e) {}
}

// =============================================================================
// Popup Communication
// =============================================================================

function notifyPopup(tabId) {
  const port = popupPorts.get(tabId);
  if (port) {
    const data = tabData.get(tabId) || null;
    console.log('[CF Cache Status] notifyPopup tabId:', tabId, 'hasData:', !!data);
    port.postMessage({ type: 'update', data });
  }
}

// =============================================================================
// Event Listeners
// =============================================================================

// --- Web Navigation Events ---

browser.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    console.log('[CF Cache Status] onBeforeNavigate tabId:', details.tabId, 'url:', details.url);
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
    console.log('[CF Cache Status] onCompleted tabId:', details.tabId, 'url:', details.url);
    const data = tabData.get(details.tabId);
    const pending = pendingNavigations.get(details.tabId);

    // Check if we never received headers (Safari limitation with external links/bookmarks)
    if (pending && !pending.headersReceived) {
      console.log('[CF Cache Status] No headers received (Safari limitation)');

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

      // Show pending icon (cloud with question mark)
      showPendingIcon(details.tabId);

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
  console.log('[CF Cache Status] processMainFrameHeaders tabId:', details.tabId, 'url:', details.url);

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
  console.log('[CF Cache Status] Detected cdn:', cdn, 'status:', status, 'headers:', Object.keys(headers).join(', '));

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
      console.log('[CF Cache Status] onHeadersReceived tabId:', details.tabId);
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
      console.log('[CF Cache Status] onResponseStarted fallback tabId:', details.tabId);
      processMainFrameHeaders(details);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// --- Tab Events ---

browser.tabs.onRemoved.addListener((tabId) => {
  console.log('[CF Cache Status] onRemoved tabId:', tabId);
  tabData.delete(tabId);
  popupPorts.delete(tabId);
  pendingNavigations.delete(tabId);
});

browser.tabs.onActivated.addListener((activeInfo) => {
  const data = tabData.get(activeInfo.tabId);
  console.log('[CF Cache Status] onActivated tabId:', activeInfo.tabId, 'hasData:', !!data, 'status:', data?.status);
  if (data) {
    if (data.noHeaders) {
      showPendingIcon(activeInfo.tabId);
    } else {
      updateBadge(activeInfo.tabId, data.status);
    }
  } else {
    clearBadge(activeInfo.tabId);
  }
});

// --- Window Events ---

browser.windows.onFocusChanged.addListener(async (windowId) => {
  console.log('[CF Cache Status] onFocusChanged, windowId:', windowId, 'cachedIsDark:', cachedIsDark);
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    console.log('[CF Cache Status] Window lost focus (WINDOW_ID_NONE), ignoring');
    return;
  }

  try {
    const tabs = await browser.tabs.query({ active: true, windowId });
    console.log('[CF Cache Status] Active tab:', tabs?.[0]?.id, 'hasData:', tabData.has(tabs?.[0]?.id));
    if (tabs?.[0]) {
      const data = tabData.get(tabs[0].id);
      if (data) {
        if (data.noHeaders) {
          showPendingIcon(tabs[0].id);
        } else {
          updateBadge(tabs[0].id, data.status);
        }
      } else {
        clearBadge(tabs[0].id);
      }
    }
  } catch (e) {
    console.error('[CF Cache Status] onFocusChanged error:', e);
  }
});

// --- Message Handling ---

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getTabData') {
    sendResponse(tabData.get(message.tabId) || null);
  }

  if (message.type === 'colorScheme') {
    console.log('[CF Cache Status] Received colorScheme message, isDark:', message.isDark, 'from:', sender.tab?.url || sender.url || 'popup');
    const changed = cachedIsDark !== message.isDark;
    cachedIsDark = message.isDark;
    console.log('[CF Cache Status] cachedIsDark updated to:', cachedIsDark, 'changed:', changed);
    if (changed) {
      console.log('[CF Cache Status] Updating all tab icons');
      updateAllTabIcons();
    }
  }

  if (message.type === 'performanceData' && sender.tab) {
    console.log('[CF Cache Status] performanceData received tabId:', sender.tab.id, 'ttfb:', message.metrics?.ttfb);
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
  console.log('[CF Cache Status] onConnect port:', port.name);
  if (port.name !== 'popup') return;

  port.onMessage.addListener((msg) => {
    if (msg.type === 'subscribe' && msg.tabId) {
      console.log('[CF Cache Status] Popup subscribed to tabId:', msg.tabId);
      popupPorts.set(msg.tabId, port);
      port.postMessage({ type: 'update', data: tabData.get(msg.tabId) || null });
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('[CF Cache Status] Popup disconnected');
    for (const [tabId, p] of popupPorts) {
      if (p === port) {
        popupPorts.delete(tabId);
        break;
      }
    }
  });
});

// --- Color Scheme Handling ---

async function updateAllTabIcons() {
  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      const data = tabData.get(tab.id);
      if (data) {
        if (data.noHeaders) {
          showPendingIcon(tab.id);
        } else {
          updateBadge(tab.id, data.status);
        }
      }
    }
    // Also update the default icon for tabs without data
    browser.action.setIcon({ path: getDefaultIcon() });
  } catch (e) {
    // Ignore errors
  }
}

// Note: Color scheme detection happens via popup.js which has DOM access.
// The popup sends a 'colorScheme' message when opened, updating cachedIsDark.
