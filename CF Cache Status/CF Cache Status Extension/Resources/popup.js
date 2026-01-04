/**
 * Cache Status - Popup Script
 *
 * Displays CDN cache information for the current tab in a popup UI.
 * Shows cache status, edge location, and relevant HTTP headers.
 */

// =============================================================================
// Configuration
// =============================================================================

const EDGE_LOCATIONS = {
  // North America
  'IAD': 'Ashburn, VA', 'CMH': 'Columbus, OH', 'ORD': 'Chicago, IL',
  'DFW': 'Dallas, TX', 'DEN': 'Denver, CO', 'HIO': 'Hillsboro, OR',
  'IAH': 'Houston, TX', 'JAX': 'Jacksonville, FL', 'LAX': 'Los Angeles, CA',
  'MIA': 'Miami, FL', 'MSP': 'Minneapolis, MN', 'YUL': 'Montreal, QC',
  'JFK': 'New York, NY', 'EWR': 'Newark, NJ', 'PHX': 'Phoenix, AZ',
  'SFO': 'San Francisco, CA', 'SEA': 'Seattle, WA', 'YTO': 'Toronto, ON',
  'ATL': 'Atlanta, GA', 'BOS': 'Boston, MA', 'SLC': 'Salt Lake City, UT',
  'PDX': 'Portland, OR', 'PHL': 'Philadelphia, PA', 'CLT': 'Charlotte, NC',
  'QRO': 'Queretaro, MX',
  // Europe
  'AMS': 'Amsterdam, NL', 'TXL': 'Berlin, DE', 'BRU': 'Brussels, BE',
  'OTP': 'Bucharest, RO', 'BUD': 'Budapest, HU', 'CPH': 'Copenhagen, DK',
  'DUB': 'Dublin, IE', 'DUS': 'Dusseldorf, DE', 'FRA': 'Frankfurt, DE',
  'HAM': 'Hamburg, DE', 'HEL': 'Helsinki, FI', 'LIS': 'Lisbon, PT',
  'LHR': 'London, UK', 'MAD': 'Madrid, ES', 'MAN': 'Manchester, UK',
  'MRS': 'Marseille, FR', 'MXP': 'Milan, IT', 'MUC': 'Munich, DE',
  'OSL': 'Oslo, NO', 'PMO': 'Palermo, IT', 'CDG': 'Paris, FR',
  'PRG': 'Prague, CZ', 'FCO': 'Rome, IT', 'SOF': 'Sofia, BG',
  'ARN': 'Stockholm, SE', 'VIE': 'Vienna, AT', 'WAW': 'Warsaw, PL',
  'ZAG': 'Zagreb, HR', 'ZRH': 'Zurich, CH',
  // Asia Pacific
  'BLR': 'Bangalore, IN', 'BKK': 'Bangkok, TH', 'MAA': 'Chennai, IN',
  'HKG': 'Hong Kong', 'HYD': 'Hyderabad, IN', 'CGK': 'Jakarta, ID',
  'CCU': 'Kolkata, IN', 'KUL': 'Kuala Lumpur, MY', 'MNL': 'Manila, PH',
  'BOM': 'Mumbai, IN', 'DEL': 'New Delhi, IN', 'KIX': 'Osaka, JP',
  'ICN': 'Seoul, KR', 'SIN': 'Singapore', 'TPE': 'Taipei, TW',
  'NRT': 'Tokyo, JP', 'HND': 'Tokyo, JP',
  // Australia & NZ
  'AKL': 'Auckland, NZ', 'MEL': 'Melbourne, AU', 'PER': 'Perth, AU',
  'SYD': 'Sydney, AU', 'BNE': 'Brisbane, AU',
  // South America
  'EZE': 'Buenos Aires, AR', 'BOG': 'Bogota, CO', 'FOR': 'Fortaleza, BR',
  'LIM': 'Lima, PE', 'GRU': 'Sao Paulo, BR', 'SCL': 'Santiago, CL',
  'GIG': 'Rio de Janeiro, BR',
  // Middle East & Africa
  'BAH': 'Bahrain', 'CPT': 'Cape Town, ZA', 'DXB': 'Dubai, AE',
  'FJR': 'Fujairah, AE', 'JNB': 'Johannesburg, ZA', 'NBO': 'Nairobi, KE',
  'TLV': 'Tel Aviv, IL'
};

const CACHE_HEADERS = [
  'x-cache', 'cf-cache-status', 'cdn-cache',
  'x-amz-cf-pop', 'cf-pop', 'x-edge-location', 'x-served-by',
  'age', 'expires', 'cache-control', 'etag', 'last-modified', 'vary', 'pragma',
  'cf-ray', 'x-amz-cf-id', 'x-akamai-request-id', 'cdn-requestid', 'cdn-pullzone',
  'x-cache-hits', 'x-timer', 'x-varnish'
];

const RESPONSE_HEADERS = ['server', 'content-type', 'via'];

const CDN_NAMES = {
  'cloudflare': 'Cloudflare', 'cloudfront': 'CloudFront', 'fastly': 'Fastly',
  'akamai': 'Akamai', 'bunny': 'Bunny CDN', 'varnish': 'Varnish', 'cdn': 'CDN'
};

const STATUS_DESCRIPTIONS = {
  'HIT': 'Served from {cdn} cache',
  'MISS': 'Fetched from origin server',
  'EXPIRED': 'Cache expired, fetched from origin',
  'STALE': 'Serving stale content',
  'REVALIDATED': 'Cache revalidated with origin',
  'BYPASS': 'Cache bypassed',
  'DYNAMIC': 'Dynamic content, not cached',
  'REFRESH': 'Cache refreshed from origin',
  'ERROR': 'Error retrieving from origin'
};

const PERFORMANCE_METRICS = [
  { key: 'ttfb', label: 'TTFB' },
  { key: 'dns', label: 'DNS Lookup', optional: true },
  { key: 'tcp', label: 'TCP Connect' },
  { key: 'tls', label: 'TLS Handshake', optional: true },
  { key: 'download', label: 'Download' },
  { key: 'domInteractive', label: 'DOM Interactive' },
  { key: 'pageLoad', label: 'Page Load' },
  { key: 'transferSize', label: 'Transfer Size', format: 'bytes' }
];

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
    const cdnName = CDN_NAMES[data.cdn] || 'CDN';
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
