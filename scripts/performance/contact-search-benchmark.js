import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for performance tracking
export let errorRate = new Rate('errors');
export let searchDuration = new Trend('search_duration', true);
export let listDuration = new Trend('list_duration', true);
export let detailDuration = new Trend('detail_duration', true);

// Performance thresholds based on PRD requirements
export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '2m', target: 50 },   // Peak load  
    { duration: '30s', target: 100 }, // Stress test
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // PRD requirement: <150ms p95 for contact list operations
    'search_duration': ['p(95)<150', 'p(99)<300'],
    'list_duration': ['p(95)<150', 'p(99)<250'],
    'detail_duration': ['p(95)<100', 'p(99)<200'],
    'http_req_duration': ['p(95)<150'],
    'errors': ['rate<0.01'], // <1% error rate
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:7001';
const TEST_TENANT_ID = __ENV.TEST_TENANT_ID || 'test-tenant-123';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Test data - Korean names and search terms for realistic testing
const SEARCH_TERMS = [
  '김',      // Common surname
  '이',      // Common surname  
  '박',      // Common surname
  '010',     // Phone prefix
  '서울',    // Location
  '대표',    // Title
  'test',    // English term
  '',        // Empty search (all results)
];

const SORT_OPTIONS = [
  { sortBy: 'FullName', sortOrder: 'asc' },
  { sortBy: 'FullName', sortOrder: 'desc' },
  { sortBy: 'CreatedAt', sortOrder: 'desc' },
  { sortBy: 'UpdatedAt', sortOrder: 'desc' },
];

export function setup() {
  // Setup phase - create test data if needed
  console.log('Setting up performance test...');
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed: ${healthCheck.status}`);
  }
  
  console.log(`Performance test starting against: ${BASE_URL}`);
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'X-Tenant-Id': TEST_TENANT_ID,
    'Content-Type': 'application/json',
  };

  // Test scenario 1: Contact list without search (most common)
  contactListTest(headers);
  sleep(0.1);

  // Test scenario 2: Contact search with various terms
  contactSearchTest(headers);
  sleep(0.1);

  // Test scenario 3: Contact detail access
  contactDetailTest(headers);
  sleep(0.1);

  // Test scenario 4: Filtered queries with tags
  contactFilterTest(headers);
  sleep(0.2);
}

function contactListTest(headers) {
  const sortOption = SORT_OPTIONS[Math.floor(Math.random() * SORT_OPTIONS.length)];
  
  const url = `${BASE_URL}/api/contacts?page=1&limit=20&sortBy=${sortOption.sortBy}&sortOrder=${sortOption.sortOrder}`;
  
  const response = http.get(url, { headers });
  
  const success = check(response, {
    'list status is 200': (r) => r.status === 200,
    'list has contacts': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.contacts && Array.isArray(json.contacts);
      } catch {
        return false;
      }
    },
    'list response time < 150ms': (r) => r.timings.duration < 150,
  });

  listDuration.add(response.timings.duration);
  errorRate.add(!success);

  if (!success) {
    console.log(`List test failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }
}

function contactSearchTest(headers) {
  const searchTerm = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const sortOption = SORT_OPTIONS[Math.floor(Math.random() * SORT_OPTIONS.length)];
  const isActive = Math.random() > 0.5 ? 'true' : undefined;
  
  let url = `${BASE_URL}/api/contacts?page=1&limit=20&sortBy=${sortOption.sortBy}&sortOrder=${sortOption.sortOrder}`;
  
  if (searchTerm) {
    url += `&search=${encodeURIComponent(searchTerm)}`;
  }
  if (isActive) {
    url += `&isActive=${isActive}`;
  }
  
  const response = http.get(url, { headers });
  
  const success = check(response, {
    'search status is 200': (r) => r.status === 200,
    'search has results': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.contacts !== undefined && json.totalCount !== undefined;
      } catch {
        return false;
      }
    },
    'search response time < 150ms': (r) => r.timings.duration < 150,
    'search response size reasonable': (r) => r.body.length < 100000, // <100KB
  });

  searchDuration.add(response.timings.duration);
  errorRate.add(!success);

  if (!success) {
    console.log(`Search test failed for "${searchTerm}": ${response.status} - ${response.body.substring(0, 200)}`);
  }
}

function contactDetailTest(headers) {
  // First get a list to find a valid contact ID
  const listResponse = http.get(`${BASE_URL}/api/contacts?page=1&limit=1`, { headers });
  
  if (listResponse.status !== 200) {
    errorRate.add(1);
    return;
  }

  try {
    const listJson = JSON.parse(listResponse.body);
    if (!listJson.contacts || listJson.contacts.length === 0) {
      // No contacts to test with
      return;
    }

    const contactId = listJson.contacts[0].id;
    const detailResponse = http.get(`${BASE_URL}/api/contacts/${contactId}`, { headers });
    
    const success = check(detailResponse, {
      'detail status is 200': (r) => r.status === 200,
      'detail has contact data': (r) => {
        try {
          const json = JSON.parse(r.body);
          return json.id && json.fullName;
        } catch {
          return false;
        }
      },
      'detail response time < 100ms': (r) => r.timings.duration < 100,
    });

    detailDuration.add(detailResponse.timings.duration);
    errorRate.add(!success);

  } catch (error) {
    errorRate.add(1);
    console.log(`Detail test error: ${error.message}`);
  }
}

function contactFilterTest(headers) {
  // Test with various filter combinations
  const filters = [
    'isActive=true',
    'isActive=false', 
    'page=2&limit=50',
    'sortBy=FullName&sortOrder=asc',
  ];
  
  const filter = filters[Math.floor(Math.random() * filters.length)];
  const url = `${BASE_URL}/api/contacts?${filter}`;
  
  const response = http.get(url, { headers });
  
  const success = check(response, {
    'filter status is 200': (r) => r.status === 200,
    'filter response time reasonable': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
}

export function teardown(data) {
  console.log('Performance test completed.');
  console.log(`Test run against: ${data.baseUrl}`);
}