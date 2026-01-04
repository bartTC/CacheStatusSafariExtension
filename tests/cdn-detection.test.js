#!/usr/bin/env node
/**
 * CDN Detection Tests
 *
 * Tests the CDN detection logic using the same rules as the extension.
 * Run with: node tests/cdn-detection.test.js
 */

const {
  CDN_RULES,
  detectCDN,
  parseCacheStatus,
  getCDNName
} = require('../CF Cache Status/CF Cache Status Extension/Resources/constants.js');

// =============================================================================
// Test Cases
// =============================================================================
// Each test case has:
//   name:      Description of what's being tested
//   headers:   Response headers (lowercase keys)
//   expected:  { cdn: 'id', status: 'STATUS' } or { cdn: null }
//   reason:    Why this should match (for documentation)

const TEST_CASES = [
  // -------------------------------------------------------------------------
  // Cloudflare
  // -------------------------------------------------------------------------
  {
    name: 'Cloudflare - HIT via cf-cache-status',
    headers: {
      'cf-cache-status': 'HIT',
      'cf-ray': '12345-FRA'
    },
    expected: { cdn: 'cloudflare', status: 'HIT' },
    reason: 'cf-cache-status header present → Cloudflare'
  },
  {
    name: 'Cloudflare - MISS',
    headers: {
      'cf-cache-status': 'MISS',
      'cf-ray': '12345-LAX'
    },
    expected: { cdn: 'cloudflare', status: 'MISS' },
    reason: 'cf-cache-status=MISS'
  },
  {
    name: 'Cloudflare - DYNAMIC (not cached)',
    headers: {
      'cf-cache-status': 'DYNAMIC',
      'cf-ray': '12345-SIN'
    },
    expected: { cdn: 'cloudflare', status: 'DYNAMIC' },
    reason: 'cf-cache-status=DYNAMIC means not cacheable'
  },
  {
    name: 'Cloudflare - only cf-ray (no cache status)',
    headers: {
      'cf-ray': '12345-FRA'
    },
    expected: { cdn: 'cloudflare', status: null },
    reason: 'cf-ray alone identifies Cloudflare, but no cache status'
  },

  // -------------------------------------------------------------------------
  // CloudFront
  // -------------------------------------------------------------------------
  {
    name: 'CloudFront - HIT via x-cache',
    headers: {
      'x-amz-cf-id': 'abc123',
      'x-amz-cf-pop': 'FRA50-C1',
      'x-cache': 'Hit from cloudfront'
    },
    expected: { cdn: 'cloudfront', status: 'HIT' },
    reason: 'x-amz-cf-id header → CloudFront, x-cache contains "hit"'
  },
  {
    name: 'CloudFront - MISS',
    headers: {
      'x-amz-cf-pop': 'IAD89-C2',
      'x-cache': 'Miss from cloudfront'
    },
    expected: { cdn: 'cloudfront', status: 'MISS' },
    reason: 'x-amz-cf-pop → CloudFront, x-cache contains "miss"'
  },
  {
    name: 'CloudFront - via header detection',
    headers: {
      'via': '1.1 abc123.cloudfront.net (CloudFront)',
      'x-cache': 'Hit from cloudfront'
    },
    expected: { cdn: 'cloudfront', status: 'HIT' },
    reason: 'via header contains "cloudfront"'
  },

  // -------------------------------------------------------------------------
  // Fastly
  // -------------------------------------------------------------------------
  {
    name: 'Fastly - HIT via x-served-by',
    headers: {
      'x-served-by': 'cache-fra-eddf8230063-FRA',
      'x-cache': 'HIT',
      'x-cache-hits': '1'
    },
    expected: { cdn: 'fastly', status: 'HIT' },
    reason: 'x-served-by header → Fastly'
  },
  {
    name: 'Fastly - MISS',
    headers: {
      'x-served-by': 'cache-lax-1234',
      'x-cache': 'MISS'
    },
    expected: { cdn: 'fastly', status: 'MISS' },
    reason: 'x-served-by → Fastly'
  },
  {
    name: 'Fastly - tiered cache (MISS, HIT, MISS)',
    headers: {
      'x-served-by': 'cache-fra-123, cache-lhr-456',
      'x-cache': 'MISS, HIT, MISS'
    },
    expected: { cdn: 'fastly', status: 'HIT' },
    reason: 'x-served-by → Fastly, reports HIT if any layer cached'
  },
  {
    name: 'Fastly - x-timer detection',
    headers: {
      'x-timer': 'S1234567890.123456,VS0,VE50'
    },
    expected: { cdn: 'fastly', status: null },
    reason: 'x-timer header → Fastly (no cache status without x-cache)'
  },

  // -------------------------------------------------------------------------
  // Akamai
  // -------------------------------------------------------------------------
  {
    name: 'Akamai - x-akamai-request-id',
    headers: {
      'x-akamai-request-id': '12345abcdef',
      'x-cache': 'TCP_HIT'
    },
    expected: { cdn: 'akamai', status: 'HIT' },
    reason: 'x-akamai-request-id header → Akamai'
  },
  {
    name: 'Akamai - server header (AkamaiGHost)',
    headers: {
      'server': 'AkamaiGHost',
      'x-cache': 'TCP_MISS'
    },
    expected: { cdn: 'akamai', status: 'MISS' },
    reason: 'server contains "akamai" → Akamai'
  },
  {
    name: 'Akamai - server header (AkamaiNetStorage)',
    headers: {
      'server': 'AkamaiNetStorage'
    },
    expected: { cdn: 'akamai', status: null },
    reason: 'server contains "akamai" → Akamai'
  },
  {
    name: 'Akamai - via header detection',
    headers: {
      'via': '1.1 akamai.net',
      'x-cache': 'TCP_REFRESH_HIT'
    },
    expected: { cdn: 'akamai', status: 'HIT' },
    reason: 'via contains "akamai" → Akamai'
  },

  // -------------------------------------------------------------------------
  // Bunny CDN
  // -------------------------------------------------------------------------
  {
    name: 'Bunny CDN - HIT via cdn-cache',
    headers: {
      'cdn-cache': 'HIT',
      'cdn-pullzone': 'my-zone',
      'cdn-requestid': 'abc123'
    },
    expected: { cdn: 'bunny', status: 'HIT' },
    reason: 'cdn-cache header → Bunny CDN'
  },
  {
    name: 'Bunny CDN - MISS',
    headers: {
      'cdn-cache': 'MISS',
      'cdn-pullzone': 'my-zone'
    },
    expected: { cdn: 'bunny', status: 'MISS' },
    reason: 'cdn-cache=MISS'
  },

  // -------------------------------------------------------------------------
  // Varnish
  // -------------------------------------------------------------------------
  {
    name: 'Varnish - x-varnish header',
    headers: {
      'x-varnish': '12345 67890',
      'x-cache': 'HIT'
    },
    expected: { cdn: 'varnish', status: 'HIT' },
    reason: 'x-varnish header → Varnish'
  },
  {
    name: 'Varnish - via header detection',
    headers: {
      'via': '1.1 varnish (Varnish/6.0)',
      'x-cache': 'MISS'
    },
    expected: { cdn: 'varnish', status: 'MISS' },
    reason: 'via contains "varnish" → Varnish'
  },

  // -------------------------------------------------------------------------
  // Generic CDN (fallback)
  // -------------------------------------------------------------------------
  {
    name: 'Generic CDN - x-cache only',
    headers: {
      'x-cache': 'HIT'
    },
    expected: { cdn: 'cdn', status: 'HIT' },
    reason: 'x-cache without specific CDN headers → generic CDN'
  },
  {
    name: 'Generic CDN - x-cache-status',
    headers: {
      'x-cache-status': 'BYPASS'
    },
    expected: { cdn: 'cdn', status: 'BYPASS' },
    reason: 'x-cache-status is also a generic cache header'
  },

  // -------------------------------------------------------------------------
  // No CDN
  // -------------------------------------------------------------------------
  {
    name: 'No CDN - only standard headers',
    headers: {
      'cache-control': 'max-age=3600',
      'server': 'nginx',
      'content-type': 'text/html'
    },
    expected: { cdn: null, status: null },
    reason: 'No CDN-specific headers → not detected'
  },
  {
    name: 'No CDN - empty headers',
    headers: {},
    expected: { cdn: null, status: null },
    reason: 'No headers → not detected'
  },

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------
  {
    name: 'Case insensitive - lowercase akamai in server',
    headers: {
      'server': 'akamaighost'
    },
    expected: { cdn: 'akamai', status: null },
    reason: 'Detection should be case-insensitive'
  },
  {
    name: 'Cloudflare takes precedence over generic x-cache',
    headers: {
      'cf-cache-status': 'HIT',
      'x-cache': 'MISS'
    },
    expected: { cdn: 'cloudflare', status: 'HIT' },
    reason: 'Cloudflare-specific header takes precedence'
  },
  {
    name: 'Refresh status parsing',
    headers: {
      'x-served-by': 'cache-fra-123',
      'x-cache': 'REFRESH'
    },
    expected: { cdn: 'fastly', status: 'REFRESH' },
    reason: 'REFRESH is a valid cache status'
  },
  {
    name: 'Error status parsing',
    headers: {
      'x-varnish': '12345',
      'x-cache': 'ERROR'
    },
    expected: { cdn: 'varnish', status: 'ERROR' },
    reason: 'ERROR is a valid cache status'
  }
];

// =============================================================================
// Test Runner
// =============================================================================

function runTests() {
  console.log('CDN Detection Tests');
  console.log('='.repeat(60));
  console.log();

  // Show CDN rules for reference
  console.log('CDN Rules (in evaluation order):');
  console.log('-'.repeat(40));
  for (const rule of CDN_RULES) {
    const conditions = rule.detect.map(c =>
      c.contains ? `${c.header} contains "${c.contains}"` : c.header
    ).join(' OR ');
    console.log(`  ${rule.name.padEnd(12)} ← ${conditions}`);
  }
  console.log();

  let passed = 0;
  let failed = 0;

  for (const test of TEST_CASES) {
    const cdn = detectCDN(test.headers);
    const status = parseCacheStatus(test.headers, cdn);

    const cdnMatch = cdn === test.expected.cdn;
    const statusMatch = status === test.expected.status;
    const success = cdnMatch && statusMatch;

    if (success) {
      passed++;
      console.log(`✓ ${test.name}`);
    } else {
      failed++;
      console.log(`✗ ${test.name}`);
      console.log(`  Expected: cdn=${test.expected.cdn}, status=${test.expected.status}`);
      console.log(`  Got:      cdn=${cdn}, status=${status}`);
      console.log(`  Reason:   ${test.reason}`);
      console.log(`  Headers:  ${JSON.stringify(test.headers)}`);
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
