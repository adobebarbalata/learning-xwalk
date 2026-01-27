/**
 * Cloudflare Worker - SAP Product Price API Proxy
 * 
 * This worker proxies requests to the SAP API, adding CORS headers
 * so the API can be called from any origin.
 * 
 * Deploy to Cloudflare Workers and update the SAP_PROXY_URL in your block.
 * 
 * Usage:
 * 1. Create a Cloudflare account and set up Workers
 * 2. Deploy this worker (e.g., via wrangler CLI or dashboard)
 * 3. Update your block to use the worker URL instead of direct SAP API
 */

const SAP_API_BASE = 'https://www.sap.com/api/edge/pdp/product-price';

// Allowed origins (add your domains)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://main--learning-xwalk--adobebarbalata.aem.page',
  'https://main--learning-xwalk--adobebarbalata.aem.live',
];

/**
 * Handle CORS preflight requests
 */
function handleOptions(request) {
  const origin = request.headers.get('Origin');
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin?.endsWith('.aem.page') || origin?.endsWith('.aem.live');

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Proxy request to SAP API
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin?.endsWith('.aem.page') || origin?.endsWith('.aem.live');

  // Build SAP API URL with query params
  const sapUrl = new URL(SAP_API_BASE);
  
  // Pass through all query parameters
  url.searchParams.forEach((value, key) => {
    sapUrl.searchParams.set(key, value);
  });

  try {
    // Fetch from SAP API
    const response = await fetch(sapUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AEM-EDS-Proxy/1.0',
      },
    });

    // Get response body
    const body = await response.text();

    // Return with CORS headers
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': isAllowed ? origin : '*',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': isAllowed ? origin : '*',
      },
    });
  }
}

/**
 * Worker entry point
 */
export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    return handleRequest(request);
  },
};
