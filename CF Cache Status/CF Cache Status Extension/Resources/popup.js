/**
 * CF Cache Status - Popup Script
 *
 * Displays CDN cache information for the current tab in a popup UI.
 * Shows cache status, edge location, and relevant HTTP headers.
 */

// =============================================================================
// Edge Location Mapping
// =============================================================================

/**
 * Maps CDN edge location codes (IATA airport codes) to city names.
 * Used for CloudFront x-amz-cf-pop and Cloudflare cf-ray headers.
 */
const EDGE_LOCATIONS = {
  // North America
  'IAD': 'Ashburn, VA',
  'CMH': 'Columbus, OH',
  'ORD': 'Chicago, IL',
  'DFW': 'Dallas, TX',
  'DEN': 'Denver, CO',
  'HIO': 'Hillsboro, OR',
  'IAH': 'Houston, TX',
  'JAX': 'Jacksonville, FL',
  'LAX': 'Los Angeles, CA',
  'MIA': 'Miami, FL',
  'MSP': 'Minneapolis, MN',
  'YUL': 'Montreal, QC',
  'JFK': 'New York, NY',
  'EWR': 'Newark, NJ',
  'PHX': 'Phoenix, AZ',
  'SFO': 'San Francisco, CA',
  'SEA': 'Seattle, WA',
  'YTO': 'Toronto, ON',
  'ATL': 'Atlanta, GA',
  'BOS': 'Boston, MA',
  'SLC': 'Salt Lake City, UT',
  'PDX': 'Portland, OR',
  'PHL': 'Philadelphia, PA',
  'CLT': 'Charlotte, NC',
  'QRO': 'Queretaro, MX',

  // Europe
  'AMS': 'Amsterdam, NL',
  'TXL': 'Berlin, DE',
  'BRU': 'Brussels, BE',
  'OTP': 'Bucharest, RO',
  'BUD': 'Budapest, HU',
  'CPH': 'Copenhagen, DK',
  'DUB': 'Dublin, IE',
  'DUS': 'Dusseldorf, DE',
  'FRA': 'Frankfurt, DE',
  'HAM': 'Hamburg, DE',
  'HEL': 'Helsinki, FI',
  'LIS': 'Lisbon, PT',
  'LHR': 'London, UK',
  'MAD': 'Madrid, ES',
  'MAN': 'Manchester, UK',
  'MRS': 'Marseille, FR',
  'MXP': 'Milan, IT',
  'MUC': 'Munich, DE',
  'OSL': 'Oslo, NO',
  'PMO': 'Palermo, IT',
  'CDG': 'Paris, FR',
  'PRG': 'Prague, CZ',
  'FCO': 'Rome, IT',
  'SOF': 'Sofia, BG',
  'ARN': 'Stockholm, SE',
  'VIE': 'Vienna, AT',
  'WAW': 'Warsaw, PL',
  'ZAG': 'Zagreb, HR',
  'ZRH': 'Zurich, CH',

  // Asia Pacific
  'BLR': 'Bangalore, IN',
  'BKK': 'Bangkok, TH',
  'MAA': 'Chennai, IN',
  'HKG': 'Hong Kong',
  'HYD': 'Hyderabad, IN',
  'CGK': 'Jakarta, ID',
  'CCU': 'Kolkata, IN',
  'KUL': 'Kuala Lumpur, MY',
  'MNL': 'Manila, PH',
  'BOM': 'Mumbai, IN',
  'DEL': 'New Delhi, IN',
  'KIX': 'Osaka, JP',
  'ICN': 'Seoul, KR',
  'SIN': 'Singapore',
  'TPE': 'Taipei, TW',
  'NRT': 'Tokyo, JP',
  'HND': 'Tokyo, JP',

  // Australia & NZ
  'AKL': 'Auckland, NZ',
  'MEL': 'Melbourne, AU',
  'PER': 'Perth, AU',
  'SYD': 'Sydney, AU',
  'BNE': 'Brisbane, AU',

  // South America
  'EZE': 'Buenos Aires, AR',
  'BOG': 'Bogota, CO',
  'FOR': 'Fortaleza, BR',
  'LIM': 'Lima, PE',
  'GRU': 'Sao Paulo, BR',
  'SCL': 'Santiago, CL',
  'GIG': 'Rio de Janeiro, BR',

  // Middle East & Africa
  'BAH': 'Bahrain',
  'CPT': 'Cape Town, ZA',
  'DXB': 'Dubai, AE',
  'FJR': 'Fujairah, AE',
  'JNB': 'Johannesburg, ZA',
  'NBO': 'Nairobi, KE',
  'TLV': 'Tel Aviv, IL'
};

// =============================================================================
// Display Configuration
// =============================================================================

/** Maps header names to human-readable labels */
const HEADER_LABELS = {
  // Cloudflare
  'cf-cache-status': 'Cache Status',
  'cf-ray': 'CF-Ray',
  'cf-pop': 'Edge Location',
  // CloudFront
  'x-amz-cf-id': 'Request ID',
  'x-amz-cf-pop': 'Edge Location',
  // Fastly
  'x-served-by': 'Served By',
  'x-cache-hits': 'Cache Hits',
  'x-timer': 'Timer',
  // Akamai
  'x-akamai-request-id': 'Request ID',
  // Bunny CDN
  'cdn-cache': 'Cache Status',
  'cdn-pullzone': 'Pull Zone',
  'cdn-requestid': 'Request ID',
  // Generic
  'x-cache': 'X-Cache',
  'x-cache-status': 'Cache Status',
  'x-varnish': 'Varnish ID',
  'x-edge-location': 'Edge Location',
  'via': 'Via',
  // Cache control
  'age': 'Age',
  'cache-control': 'Cache-Control',
  'expires': 'Expires',
  'etag': 'ETag',
  'last-modified': 'Last-Modified',
  'vary': 'Vary',
  'pragma': 'Pragma',
  // Response
  'server': 'Server',
  'content-type': 'Content-Type'
};

/** Headers shown in the Cache section (order matters) */
const CACHE_HEADERS = [
  // Status
  'x-cache', 'cf-cache-status', 'cdn-cache',
  // Edge location
  'x-amz-cf-pop', 'cf-pop', 'x-edge-location', 'x-served-by',
  // Cache timing and control
  'age', 'expires', 'cache-control', 'etag', 'last-modified', 'vary', 'pragma',
  // CDN-specific identifiers
  'cf-ray', 'x-amz-cf-id', 'x-akamai-request-id', 'cdn-requestid', 'cdn-pullzone',
  'x-cache-hits', 'x-timer', 'x-varnish'
];

/** Headers shown in the Response section */
const RESPONSE_HEADERS = ['server', 'content-type', 'via'];

/** Human-readable CDN names */
const CDN_NAMES = {
  'cloudflare': 'Cloudflare',
  'cloudfront': 'CloudFront',
  'fastly': 'Fastly',
  'akamai': 'Akamai',
  'bunny': 'Bunny CDN',
  'varnish': 'Varnish',
  'cdn': 'CDN'
};

/** Performance metrics to display (order matters) */
const PERFORMANCE_METRICS = [
  { key: 'ttfb', label: 'TTFB', description: 'Time to First Byte' },
  { key: 'dns', label: 'DNS Lookup' },
  { key: 'tcp', label: 'TCP Connect' },
  { key: 'tls', label: 'TLS Handshake' },
  { key: 'download', label: 'Download' },
  { key: 'domInteractive', label: 'DOM Interactive' },
  { key: 'pageLoad', label: 'Page Load' },
  { key: 'transferSize', label: 'Transfer Size', format: 'bytes' }
];

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initializes the popup by fetching and displaying data for the current tab.
 */
async function init() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs?.length) {
      showNoData();
      return;
    }

    const data = await browser.runtime.sendMessage({
      type: 'getTabData',
      tabId: tabs[0].id
    });

    if (!data?.headers || Object.keys(data.headers).length === 0) {
      showNoData();
      return;
    }

    updateStatus(data.status, data.cdn, data.performance);
    populateHeaders(data.headers, data.cdn);
    populatePerformance(data.performance);

    if (data.url) {
      document.getElementById('page-url').textContent = data.url;
      document.getElementById('url-container').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading data:', error);
    showNoData();
  }
}

// =============================================================================
// UI Updates
// =============================================================================

/**
 * Shows the "no data" state when no CDN headers are detected.
 */
function showNoData() {
  document.getElementById('status-badge').textContent = '--';
  document.getElementById('status-badge').className = '';
  document.getElementById('status-label').textContent = 'No CDN headers detected';
  document.getElementById('no-data').classList.remove('hidden');
  document.getElementById('cache-section').classList.add('hidden');
  document.getElementById('response-section').classList.add('hidden');
}

/**
 * Updates the status badge and label based on cache status.
 * @param {string|null} status - Cache status (HIT, MISS, etc.)
 * @param {string|null} cdn - CDN identifier
 * @param {Object|null} performance - Performance metrics
 */
function updateStatus(status, cdn, performance) {
  const badge = document.getElementById('status-badge');
  const label = document.getElementById('status-label');
  const cdnName = CDN_NAMES[cdn] || 'CDN';

  if (!status) {
    badge.textContent = 'N/A';
    badge.className = '';
    label.textContent = 'No cache status header';
    return;
  }

  badge.textContent = status;
  badge.className = status.toLowerCase();

  // Human-readable status descriptions
  const descriptions = {
    'HIT': `Served from ${cdnName} cache`,
    'MISS': 'Fetched from origin server',
    'EXPIRED': 'Cache expired, fetched from origin',
    'STALE': 'Serving stale content',
    'REVALIDATED': 'Cache revalidated with origin',
    'BYPASS': 'Cache bypassed',
    'DYNAMIC': 'Dynamic content, not cached',
    'REFRESH': 'Cache refreshed from origin',
    'ERROR': 'Error retrieving from origin'
  };

  let text = descriptions[status.toUpperCase()] || `${cdnName} cache status`;

  // Append performance metrics if available
  if (performance) {
    const parts = [];
    if (performance.ttfb > 0) {
      parts.push(formatPerformanceValue(performance.ttfb));
    }
    if (performance.transferSize > 0) {
      parts.push(formatPerformanceValue(performance.transferSize, 'bytes'));
    }
    if (parts.length > 0) {
      text += ` (${parts.join(', ')})`;
    }
  }

  label.textContent = text;
}

/**
 * Populates the header sections with available headers.
 * @param {Object} headers - Header name to value mapping
 * @param {string|null} cdn - CDN identifier
 */
function populateHeaders(headers, cdn) {
  const cacheSection = document.getElementById('cache-section');
  const cacheRows = document.getElementById('cache-rows');
  const responseSection = document.getElementById('response-section');
  const responseRows = document.getElementById('response-rows');

  cacheRows.innerHTML = '';
  responseRows.innerHTML = '';

  const shown = new Set();

  // Populate cache section
  let cacheCount = 0;
  for (const key of CACHE_HEADERS) {
    if (headers[key] && !shown.has(key)) {
      cacheRows.appendChild(createRow(key, headers[key]));
      shown.add(key);
      cacheCount++;
    }
  }

  // Populate response section
  let responseCount = 0;
  for (const key of RESPONSE_HEADERS) {
    if (headers[key] && !shown.has(key)) {
      responseRows.appendChild(createRow(key, headers[key]));
      shown.add(key);
      responseCount++;
    }
  }

  if (cacheCount > 0) cacheSection.classList.remove('hidden');
  if (responseCount > 0) responseSection.classList.remove('hidden');

  // Show CloudFront-specific info about Origin Shield behavior
  if (cdn === 'cloudfront') {
    document.getElementById('info-section').classList.remove('hidden');
  }
}

/**
 * Populates the performance section with timing metrics.
 * @param {Object|null} performance - Performance metrics from Navigation Timing API
 */
function populatePerformance(performance) {
  const section = document.getElementById('performance-section');
  const rows = document.getElementById('performance-rows');

  if (!performance) {
    section.classList.add('hidden');
    return;
  }

  rows.innerHTML = '';
  let count = 0;

  for (const metric of PERFORMANCE_METRICS) {
    const value = performance[metric.key];
    if (value === null || value === undefined || value < 0) continue;
    // Skip zero values for optional metrics like TLS
    if (value === 0 && (metric.key === 'tls' || metric.key === 'dns')) continue;

    const row = document.createElement('div');
    row.className = 'row';

    const label = document.createElement('span');
    label.className = 'row-label';
    label.textContent = metric.label;

    const val = document.createElement('span');
    val.className = 'row-value';
    val.textContent = formatPerformanceValue(value, metric.format);

    row.appendChild(label);
    row.appendChild(val);
    rows.appendChild(row);
    count++;
  }

  if (count > 0) {
    section.classList.remove('hidden');
  }
}

/**
 * Formats performance values for display.
 * @param {number} value - Raw value
 * @param {string} format - Format type ('bytes' or default ms)
 * @returns {string} Formatted value
 */
function formatPerformanceValue(value, format) {
  if (format === 'bytes') {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Default: milliseconds
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

/**
 * Creates a row element for displaying a header.
 * @param {string} key - Header name
 * @param {string} value - Header value
 * @returns {HTMLElement} Row element
 */
function createRow(key, value) {
  const row = document.createElement('div');
  row.className = 'row';

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = HEADER_LABELS[key] || key;

  const val = document.createElement('span');
  val.className = 'row-value';
  val.textContent = formatHeaderValue(key, value);

  row.appendChild(label);
  row.appendChild(val);
  return row;
}

// =============================================================================
// Value Formatting
// =============================================================================

/**
 * Formats header values for display.
 * Converts age to human-readable duration, resolves edge locations to cities.
 * @param {string} key - Header name
 * @param {string} value - Raw header value
 * @returns {string} Formatted value
 */
function formatHeaderValue(key, value) {
  // Format age as human-readable duration
  if (key === 'age') {
    const seconds = parseInt(value, 10);
    if (!isNaN(seconds)) {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }

  // Extract city from Cloudflare CF-Ray (format: <ray-id>-<POP>)
  if (key === 'cf-ray') {
    const parts = value.split('-');
    if (parts.length >= 2) {
      const code = parts[parts.length - 1].toUpperCase();
      const city = EDGE_LOCATIONS[code];
      if (city) return `${city} (${code})`;
    }
  }

  // Extract city from CloudFront/Cloudflare POP (format: CODE + number, e.g., FRA56-P10)
  if (key === 'x-amz-cf-pop' || key === 'cf-pop') {
    const match = value.match(/^([A-Z]{3})/i);
    if (match) {
      const code = match[1].toUpperCase();
      const city = EDGE_LOCATIONS[code];
      if (city) return `${city} (${value})`;
    }
  }

  return value;
}

// =============================================================================
// Bootstrap
// =============================================================================

document.addEventListener('DOMContentLoaded', init);
