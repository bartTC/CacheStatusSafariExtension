/**
 * Cache Status - Shared Constants
 *
 * CDN detection rules, edge locations, and display configuration.
 * Used by background.js, popup.js, and tests.
 */

// =============================================================================
// CDN Detection Rules
// =============================================================================
// Each rule defines how to detect a CDN based on response headers.
// Rules are evaluated in order - first match wins.
//
// Rule format:
//   id:      Internal identifier
//   name:    Display name
//   detect:  Array of detection conditions (OR logic - any match triggers)
//            Each condition: { header: 'name', [contains: 'value'] }
//            If 'contains' is omitted, just checks header existence

const CDN_RULES = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    detect: [
      { header: 'cf-cache-status' },
      { header: 'cf-ray' }
    ]
  },
  {
    id: 'cloudfront',
    name: 'CloudFront',
    detect: [
      { header: 'x-amz-cf-id' },
      { header: 'x-amz-cf-pop' },
      { header: 'via', contains: 'cloudfront' }
    ]
  },
  {
    id: 'fastly',
    name: 'Fastly',
    detect: [
      { header: 'x-served-by' },
      { header: 'x-timer' }
    ]
  },
  {
    id: 'akamai',
    name: 'Akamai',
    detect: [
      { header: 'x-akamai-request-id' },
      { header: 'server', contains: 'akamai' },
      { header: 'via', contains: 'akamai' }
    ]
  },
  {
    id: 'bunny',
    name: 'Bunny CDN',
    detect: [
      { header: 'cdn-cache' },
      { header: 'cdn-pullzone' }
    ]
  },
  {
    id: 'varnish',
    name: 'Varnish',
    detect: [
      { header: 'x-varnish' },
      { header: 'via', contains: 'varnish' }
    ]
  },
  {
    id: 'cdn',
    name: 'CDN',
    detect: [
      { header: 'x-cache' },        // Generic CDN fallback
      { header: 'x-cache-status' }  // Alternative cache status header
    ]
  }
];

// =============================================================================
// Cache Status Parsing Rules
// =============================================================================
// Defines how to extract cache status from headers for each CDN.

const CACHE_STATUS_RULES = {
  // Cloudflare uses its own dedicated header
  cloudflare: {
    header: 'cf-cache-status',
    transform: 'uppercase'
  },

  // Bunny CDN uses cdn-cache header
  bunny: {
    header: 'cdn-cache',
    parse: (value) => {
      const lower = value.toLowerCase();
      if (lower.includes('hit')) return 'HIT';
      if (lower.includes('miss')) return 'MISS';
      return null;
    }
  },

  // Default: parse x-cache or x-cache-status header
  _default: {
    headers: ['x-cache', 'x-cache-status'],
    parse: (value) => {
      const lower = value.toLowerCase();
      if (lower.includes('hit')) return 'HIT';
      if (lower.includes('miss')) return 'MISS';
      if (lower.includes('refresh')) return 'REFRESH';
      if (lower.includes('error')) return 'ERROR';
      if (lower.includes('pass')) return 'BYPASS';
      if (lower.includes('expired')) return 'EXPIRED';
      return null;
    }
  }
};

// =============================================================================
// Headers to Capture and Display
// =============================================================================

// All headers we care about - used for both capture (background.js) and display (popup.js)
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
  // Generic
  'x-cache', 'x-cache-status', 'x-cache-date', 'x-varnish', 'x-edge-location', 'via',
  // Standard cache headers
  'age', 'cache-control', 'expires', 'etag', 'last-modified', 'vary', 'pragma',
  // Response metadata
  'server', 'content-type'
];

// Headers shown in "Headers" section (all except response metadata)
const CACHE_HEADERS = TRACKED_HEADERS.filter(h => !['server', 'content-type'].includes(h));

// Headers shown in "Response" section
const RESPONSE_HEADERS = ['server', 'content-type', 'via'];

// =============================================================================
// Badge Colors
// =============================================================================

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

// =============================================================================
// Edge Locations (IATA codes)
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

// =============================================================================
// Performance Metrics Config
// =============================================================================

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
// CDN Detection Functions
// =============================================================================

/**
 * Detects CDN based on response headers using CDN_RULES.
 * @param {Object} headers - Lowercase header name to value mapping
 * @returns {string|null} CDN identifier or null
 */
function detectCDN(headers) {
  for (const rule of CDN_RULES) {
    for (const condition of rule.detect) {
      const headerValue = headers[condition.header];
      if (headerValue) {
        if (condition.contains) {
          if (headerValue.toLowerCase().includes(condition.contains)) {
            return rule.id;
          }
        } else {
          return rule.id;
        }
      }
    }
  }
  return null;
}

/**
 * Parses cache status from headers based on CDN type.
 * @param {Object} headers - Lowercase header name to value mapping
 * @param {string} cdn - CDN identifier from detectCDN()
 * @returns {string|null} Normalized cache status or null
 */
function parseCacheStatus(headers, cdn) {
  const rule = CACHE_STATUS_RULES[cdn] || CACHE_STATUS_RULES._default;

  if (rule.header) {
    const value = headers[rule.header];
    if (!value) return null;
    if (rule.transform === 'uppercase') return value.toUpperCase();
    if (rule.parse) return rule.parse(value);
    return value;
  }

  if (rule.headers) {
    for (const header of rule.headers) {
      const value = headers[header];
      if (value && rule.parse) {
        const result = rule.parse(value);
        if (result) return result;
      }
    }
  }

  return null;
}

/**
 * Gets the display name for a CDN.
 * @param {string} cdnId - CDN identifier
 * @returns {string} Display name
 */
function getCDNName(cdnId) {
  const rule = CDN_RULES.find(r => r.id === cdnId);
  return rule?.name || 'CDN';
}

// =============================================================================
// Exports (for both browser and Node.js)
// =============================================================================

if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    CDN_RULES,
    CACHE_STATUS_RULES,
    TRACKED_HEADERS,
    CACHE_HEADERS,
    RESPONSE_HEADERS,
    STATUS_COLORS,
    STATUS_DESCRIPTIONS,
    EDGE_LOCATIONS,
    PERFORMANCE_METRICS,
    detectCDN,
    parseCacheStatus,
    getCDNName
  };
}
