/**
 * Cache Status - Popup Script
 *
 * Displays CDN cache information for the current tab in a popup UI.
 * Shows cache status, edge location, and relevant HTTP headers.
 */

// Import shared constants (loaded via popup.html)
// Uses: EDGE_LOCATIONS, CACHE_HEADERS, RESPONSE_HEADERS, STATUS_DESCRIPTIONS,
//       PERFORMANCE_METRICS, getCDNName

// =============================================================================
// Initialization
// =============================================================================

async function init() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs?.length) return;

    const data = await browser.runtime.sendMessage({ type: 'getTabData', tabId: tabs[0].id });
    updateUI(data);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// =============================================================================
// UI Updates
// =============================================================================

function updateUI(data) {
  const hasHeaders = data?.headers && Object.keys(data.headers).length > 0;
  const perf = data?.performance;

  // Update status badge and label
  const badge = document.getElementById('status-badge');
  const label = document.getElementById('status-label');

  let badgeText = '--';
  let labelText = 'No CDN detected';
  let badgeClass = '';

  if (hasHeaders && data.status) {
    badgeText = data.status;
    badgeClass = data.status.toLowerCase();
    const cdnName = getCDNName(data.cdn);
    labelText = (STATUS_DESCRIPTIONS[data.status.toUpperCase()] || `${cdnName} cache status`)
      .replace('{cdn}', cdnName);
  } else if (hasHeaders) {
    badgeText = 'N/A';
    labelText = 'No cache status header';
  }

  // Append performance summary to label
  const perfSummary = formatPerfSummary(perf);
  if (perfSummary) labelText += ` (${perfSummary})`;

  badge.textContent = badgeText;
  badge.className = badgeClass;
  label.textContent = labelText;

  // Populate sections
  if (hasHeaders) {
    populateHeaders(data.headers, data.cdn);
  } else {
    document.getElementById('cache-section').classList.add('hidden');
    document.getElementById('response-section').classList.add('hidden');
  }

  populatePerformance(perf);

  // Show URL
  if (data?.url) {
    document.getElementById('page-url').textContent = data.url;
    document.getElementById('url-container').classList.remove('hidden');
  }

  // Show CDN-specific info notes (only when relevant headers are present)
  if (data?.cdn === 'cloudfront' && data.status === 'MISS') {
    document.getElementById('cloudfront-info').classList.remove('hidden');
  } else if (data?.cdn === 'fastly' && data.headers?.['x-cache']) {
    document.getElementById('fastly-info').classList.remove('hidden');
  }
}

function formatPerfSummary(perf) {
  if (!perf) return '';
  const parts = [];
  if (perf.ttfb > 0) parts.push(formatValue(perf.ttfb));
  if (perf.transferSize > 0) parts.push(formatValue(perf.transferSize, 'bytes'));
  return parts.join(', ');
}

function populateHeaders(headers, cdn) {
  const cacheRows = document.getElementById('cache-rows');
  const responseRows = document.getElementById('response-rows');
  cacheRows.innerHTML = '';
  responseRows.innerHTML = '';

  const shown = new Set();
  let cacheCount = 0, responseCount = 0;

  for (const key of CACHE_HEADERS) {
    if (headers[key] && !shown.has(key)) {
      cacheRows.appendChild(createRow(titleCase(key), formatHeaderValue(key, headers[key])));
      shown.add(key);
      cacheCount++;
    }
  }

  for (const key of RESPONSE_HEADERS) {
    if (headers[key] && !shown.has(key)) {
      responseRows.appendChild(createRow(titleCase(key), headers[key]));
      shown.add(key);
      responseCount++;
    }
  }

  document.getElementById('cache-section').classList.toggle('hidden', cacheCount === 0);
  document.getElementById('response-section').classList.toggle('hidden', responseCount === 0);
}

function populatePerformance(perf) {
  const section = document.getElementById('performance-section');
  const rows = document.getElementById('performance-rows');
  rows.innerHTML = '';

  if (!perf) {
    section.classList.add('hidden');
    return;
  }

  let count = 0;
  for (const m of PERFORMANCE_METRICS) {
    const val = perf[m.key];
    if (val == null || val < 0 || (val === 0 && m.optional)) continue;
    rows.appendChild(createRow(m.label, formatValue(val, m.format)));
    count++;
  }

  section.classList.toggle('hidden', count === 0);
}

// =============================================================================
// Helpers
// =============================================================================

function createRow(label, value) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<span class="row-label">${label}</span><span class="row-value">${value}</span>`;
  return row;
}

function titleCase(header) {
  return header.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-');
}

function formatValue(val, format) {
  if (format === 'bytes') {
    if (val < 1024) return `${val} B`;
    if (val < 1024 * 1024) return `${(val / 1024).toFixed(1)} KB`;
    return `${(val / (1024 * 1024)).toFixed(2)} MB`;
  }
  return val < 1000 ? `${val} ms` : `${(val / 1000).toFixed(2)} s`;
}

function formatHeaderValue(key, value) {
  if (key === 'age') {
    const s = parseInt(value, 10);
    if (!isNaN(s)) {
      if (s < 60) return `${s}s`;
      if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
      return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    }
  }

  if (key === 'cf-ray') {
    const parts = value.split('-');
    if (parts.length >= 2) {
      const code = parts[parts.length - 1].toUpperCase();
      if (EDGE_LOCATIONS[code]) return `${EDGE_LOCATIONS[code]} (${code})`;
    }
  }

  if (key === 'x-amz-cf-pop' || key === 'cf-pop') {
    const match = value.match(/^([A-Z]{3})/i);
    if (match) {
      const code = match[1].toUpperCase();
      if (EDGE_LOCATIONS[code]) return `${EDGE_LOCATIONS[code]} (${value})`;
    }
  }

  return value;
}

// =============================================================================
// Bootstrap
// =============================================================================

document.addEventListener('DOMContentLoaded', init);
