/**
 * Product Price Block
 * Fetches product pricing data from SAP API and renders it
 */

/**
 * Format price with currency
 * @param {number} price - The price value
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
 * @param {string} locale - Locale string (e.g., 'en-US')
 * @returns {string} Formatted price string
 */
function formatPrice(price, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price);
}

const SAP_API_BASE = 'https://www.sap.com/api/edge/pdp/product-price';

/**
 * Fetch product price data from the SAP API
 * @param {string} technicalName - The product technical name/ID
 * @param {string} locale - Locale (default: 'en_us')
 * @param {string} country - Country code (default: 'RO')
 * @returns {Promise<Object>} Product price data
 */
async function fetchProductPrice(technicalName, locale = 'en_us', country = 'RO') {
  const url = `${SAP_API_BASE}?technical-name=${technicalName}&locale=${locale}&country=${country}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch product price: ${response.status}`);
  }

  return response.json();
}

/**
 * Render loading state
 * @returns {HTMLElement}
 */
function renderLoading() {
  const loading = document.createElement('div');
  loading.className = 'product-price-loading';
  loading.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading product information...</p>
  `;
  return loading;
}

/**
 * Render error state
 * @param {string} message - Error message
 * @returns {HTMLElement}
 */
function renderError(message) {
  const error = document.createElement('div');
  error.className = 'product-price-error';
  error.innerHTML = `
    <div class="error-icon">⚠️</div>
    <p>${message}</p>
  `;
  return error;
}

/**
 * Render product price data
 * @param {Object} data - Product price data from API
 * @returns {HTMLElement}
 */
function renderProductPrice(data) {
  const container = document.createElement('div');
  container.className = 'product-price-content';

  // Handle different possible API response structures
  // Adjust these based on actual SAP API response format
  const {
    productName,
    name,
    title,
    price,
    listPrice,
    salePrice,
    currency,
    currencyCode,
    description,
    sku,
    technicalName,
    availability,
    inStock,
    discount,
    discountPercentage,
    validFrom,
    validTo,
    image,
    imageUrl,
  } = data;

  const displayName = productName || name || title || 'Product';
  const displayPrice = price || listPrice || salePrice;
  const displayCurrency = currency || currencyCode || 'USD';
  const displayDescription = description || '';
  const displaySku = sku || technicalName || '';
  const displayImage = image || imageUrl;
  const isInStock = availability === 'IN_STOCK' || inStock === true;
  const hasDiscount = discount || discountPercentage || (listPrice && salePrice && listPrice > salePrice);

  container.innerHTML = `
    ${displayImage ? `
      <div class="product-price-image">
        <img src="${displayImage}" alt="${displayName}" loading="lazy" />
      </div>
    ` : ''}
    <div class="product-price-details">
      <h2 class="product-price-name">${displayName}</h2>
      ${displaySku ? `<p class="product-price-sku">SKU: ${displaySku}</p>` : ''}
      ${displayDescription ? `<p class="product-price-description">${displayDescription}</p>` : ''}
      
      <div class="product-price-pricing">
        ${hasDiscount && listPrice ? `
          <span class="product-price-original">${formatPrice(listPrice, displayCurrency)}</span>
        ` : ''}
        <span class="product-price-current ${hasDiscount ? 'on-sale' : ''}">
          ${displayPrice ? formatPrice(displayPrice, displayCurrency) : 'Price unavailable'}
        </span>
        ${discountPercentage ? `
          <span class="product-price-discount">-${discountPercentage}%</span>
        ` : ''}
      </div>

      ${typeof isInStock !== 'undefined' ? `
        <div class="product-price-availability ${isInStock ? 'in-stock' : 'out-of-stock'}">
          <span class="availability-indicator"></span>
          ${isInStock ? 'In Stock' : 'Out of Stock'}
        </div>
      ` : ''}

      ${validFrom || validTo ? `
        <p class="product-price-validity">
          ${validFrom ? `Valid from: ${new Date(validFrom).toLocaleDateString()}` : ''}
          ${validTo ? ` - Valid until: ${new Date(validTo).toLocaleDateString()}` : ''}
        </p>
      ` : ''}
    </div>
  `;

  // If we got raw data that doesn't match expected structure, show it formatted
  if (!displayPrice && !displayName) {
    container.innerHTML = `
      <div class="product-price-raw">
        <h3>Product Data</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }

  return container;
}

/**
 * Main block decorator
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  // Extract configuration from the block content
  // Expected format: first row contains technical-name, locale, country
  const rows = [...block.children];
  let technicalName = '';
  let locale = 'en_us';
  let country = 'RO';

  if (rows.length > 0) {
    const cells = [...rows[0].children];
    technicalName = cells[0]?.textContent?.trim() || '';
    locale = cells[1]?.textContent?.trim() || 'en_us';
    country = cells[2]?.textContent?.trim() || 'RO';
  }

  // Clear the block content
  block.innerHTML = '';

  if (!technicalName) {
    block.appendChild(renderError('Product technical name is required'));
    return;
  }

  // Show loading state
  block.appendChild(renderLoading());

  try {
    const data = await fetchProductPrice(technicalName, locale, country);
    block.innerHTML = '';
    block.appendChild(renderProductPrice(data));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching product price:', error);
    block.innerHTML = '';
    block.appendChild(renderError(`Unable to load product information: ${error.message}`));
  }
}
