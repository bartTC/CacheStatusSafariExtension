/**
 * Cache Status - Popup Script
 * 
 * macOS Native Inspector Design
 * Features: Dark Mode support, Dynamic Grid, Full Stats.
 */

const ICONS = {
  CHECK: '<path d="M10.6,18.9L10.6,18.9c-0.4,0.4-1,0.4-1.4,0L4.3,14c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l4.2,4.2l9.6-9.6 c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4L10.6,18.9z"/>',
  CROSS: '<path d="M13.4,12l5.3-5.3c0.4-0.4,0.4-1,0-1.4s-1-0.4-1.4,0L12,10.6L6.7,5.3c-0.4-0.4-1-0.4-1.4,0s-0.4,1,0,1.4L10.6,12l-5.3,5.3 c-0.4,0.4-0.4,1,0,1.4s1,0.4,1.4,0L12,13.4l5.3,5.3c0.4,0.4,1,0.4,1.4,0s0.4-1,0-1.4L13.4,12z"/>',
  WARN: '<path d="M12,2L1,21h22L12,2z M13,18h-2v-2h2V18z M13,14h-2V8h2V14z"/>',
  DASH: '<path d="M7,11h10c0.6,0,1,0.4,1,1s-0.4,1-1,1H7c-0.6,0-1-0.4-1-1S6.4,11,7,11z"/>'
};

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
    renderHero('ERROR', 'Error loading data', 'neutral');
  }
}

// =============================================================================
// UI Updates
// =============================================================================

function updateUI(data) {
  const hasHeaders = data?.headers && Object.keys(data.headers).length > 0;
  const perf = data?.performance;

  // 1. Hero Section
  if (hasHeaders && data.status) {
    const cdnName = getCDNName(data.cdn);
    const statusType = getStatusType(data.status);
    const subtitle = (STATUS_DESCRIPTIONS[data.status.toUpperCase()] || `${cdnName} detected`)
      .replace('{cdn}', cdnName);
    
    renderHero(data.status, subtitle, statusType);
  } else if (hasHeaders) {
    renderHero('N/A', 'No cache status detected', 'neutral');
  } else {
    renderHero('No Data', 'No CDN headers found', 'neutral');
    hideAllSections();
    return;
  }

  // 2. Metrics Grid (Dynamic)
  populateMetrics(perf, data.headers);

  // 3. Headers List
  populateHeadersList(data.headers);

  // 4. Performance Breakdown
  populatePerformanceList(perf);

  // 5. Info / Help Messages
  populateInfoSection(data);

  // 6. Footer (URL)
  if (data?.url) {
    document.getElementById('page-url').textContent = data.url;
    document.getElementById('footer').classList.remove('hidden');
  }
}

function hideAllSections() {
  document.getElementById('metrics-section').classList.add('hidden');
  document.getElementById('headers-section').classList.add('hidden');
  document.getElementById('perf-section').classList.add('hidden');
  document.getElementById('info-section').classList.add('hidden');
  document.getElementById('footer').classList.add('hidden');
}

// =============================================================================
// Render Functions
// =============================================================================

function renderHero(title, subtitle, type) {
  const titleEl = document.getElementById('status-title');
  const subEl = document.getElementById('status-subtitle');
  const iconContainer = document.getElementById('hero-icon');
  
  titleEl.textContent = title;
  subEl.textContent = subtitle;

  titleEl.className = `status-title status-${type}`;
  iconContainer.className = `hero-icon-container status-${type}`;

  let iconPath = ICONS.DASH;
  if (type === 'hit') iconPath = ICONS.CHECK;
  if (type === 'miss' || type === 'error') iconPath = ICONS.CROSS;
  if (type === 'warn') iconPath = ICONS.WARN;
  
  iconContainer.innerHTML = `<svg class="hero-icon-svg" viewBox="0 0 24 24">${iconPath}</svg>`;
}

function populateMetrics(perf, headers) {
  const grid = document.getElementById('metrics-grid');
  grid.innerHTML = '';
  const metrics = [];

  // 1. TTFB
  if (perf?.ttfb) {
    metrics.push({ label: 'TTFB', value: formatTime(perf.ttfb) });
  }

  // 2. Transfer Size
  if (perf?.transferSize) {
    metrics.push({ label: 'Size', value: formatBytes(perf.transferSize) });
  }

  // 3. Age
  if (headers['age']) {
    metrics.push({ label: 'Age', value: formatAge(headers['age']) });
  }

  // 4. POP Location
  const pop = findPop(headers);
  if (pop) {
    metrics.push({ label: 'Edge Location', value: pop });
  }

  // --- Dynamic Grid Logic ---
  // If we have an odd number of items, we make the LAST item span full width
  // to prevent a "gap" in the grid.
  
  if (metrics.length === 0) {
    document.getElementById('metrics-section').classList.add('hidden');
  } else {
    document.getElementById('metrics-section').classList.remove('hidden');
    
    metrics.forEach((m, index) => {
      // Check if this is the last item AND the total count is odd
      const isLast = index === metrics.length - 1;
      const isOddCount = metrics.length % 2 !== 0;
      
      const shouldSpan = isLast && isOddCount;
      
      grid.appendChild(createGridItem(m.label, m.value, shouldSpan));
    });
  }
}

function populatePerformanceList(perf) {
  const list = document.getElementById('perf-list');
  list.innerHTML = '';
  const section = document.getElementById('perf-section');

  if (!perf) {
    section.classList.add('hidden');
    return;
  }

  // Include all timing-related metrics
  let count = 0;
  for (const m of PERFORMANCE_METRICS) {
    // Skip non-timing metrics like transferSize
    if (m.key === 'transferSize') continue;
    
    const val = perf[m.key];
    if (val != null && val >= 0 && !(val === 0 && m.optional)) {
      list.appendChild(createDetailRow(m.label, formatTime(val), false));
      count++;
    }
  }

  section.classList.toggle('hidden', count === 0);
}

function populateHeadersList(headers) {
  const list = document.getElementById('headers-list');
  list.innerHTML = '';
  
  const keysToShow = [...CACHE_HEADERS, ...RESPONSE_HEADERS];
  const shown = new Set();
  let count = 0;

  for (const key of keysToShow) {
    if (headers[key] && !shown.has(key)) {
      const displayKey = key.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('-');
      list.appendChild(createDetailRow(displayKey, formatHeaderValue(key, headers[key]), true));
      shown.add(key);
      count++;
    }
  }

  document.getElementById('headers-section').classList.toggle('hidden', count === 0);
}

function populateInfoSection(data) {
  const section = document.getElementById('info-section');
  const cfInfo = document.getElementById('info-cloudfront');
  const fastlyInfo = document.getElementById('info-fastly');
  
  // Reset
  section.classList.add('hidden');
  cfInfo.classList.add('hidden');
  fastlyInfo.classList.add('hidden');

  let showSection = false;

  if (data?.cdn === 'cloudfront' && data.status === 'MISS') {
    cfInfo.classList.remove('hidden');
    showSection = true;
  } else if (data?.cdn === 'fastly' && data.headers?.['x-cache']) {
    fastlyInfo.classList.remove('hidden');
    showSection = true;
  }

  if (showSection) {
    section.classList.remove('hidden');
  }
}

// =============================================================================
// Helpers
// =============================================================================

function createGridItem(label, value, fullWidth = false) {
  const div = document.createElement('div');
  div.className = 'metric-item' + (fullWidth ? ' full-width' : '');
  div.innerHTML = `<span class="metric-label">${label}</span><span class="metric-value">${value}</span>`;
  return div;
}

function createDetailRow(key, value, monospace = false) {
  const div = document.createElement('div');
  div.className = 'detail-row';
  const valClass = monospace ? 'detail-value monospace' : 'detail-value';
  div.innerHTML = `<span class="detail-key">${key}</span><span class="${valClass}">${value}</span>`;
  return div;
}

function getStatusType(status) {
  const s = status.toUpperCase();
  if (s === 'HIT') return 'hit';
  if (s === 'MISS' || s === 'ERROR') return 'miss';
  if (['EXPIRED', 'STALE', 'REVALIDATED', 'REFRESH'].includes(s)) return 'warn';
  return 'neutral';
}

function formatTime(ms) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAge(val) {
  const s = parseInt(val, 10);
  if (isNaN(s)) return val;
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function findPop(headers) {
  let code = null;
  if (headers['cf-pop']) code = headers['cf-pop'].toUpperCase();
  else if (headers['x-amz-cf-pop']) code = headers['x-amz-cf-pop'].slice(0, 3).toUpperCase();
  
  if (!code && headers['cf-ray']) {
    const parts = headers['cf-ray'].split('-');
    if (parts.length > 1) {
      code = parts[parts.length - 1].toUpperCase();
    }
  }

  if (code) {
    if (EDGE_LOCATIONS[code]) {
      return `${EDGE_LOCATIONS[code]} (${code})`;
    }
    return code;
  }
  return null;
}

function formatHeaderValue(key, value) {
  if (key.toLowerCase() === 'cf-ray') {
     const parts = value.split('-');
     const code = parts[parts.length - 1].toUpperCase();
     if (EDGE_LOCATIONS[code]) return `${value} (${EDGE_LOCATIONS[code]})`;
  }
  return value;
}

// Bootstrap
document.addEventListener('DOMContentLoaded', init);