/**
 * MoStudy User Data Cache Helper
 * 
 * Implements stale-while-revalidate caching pattern:
 * - Data is cached in localStorage with a timestamp
 * - Cache is considered stale after 15 seconds
 * - Stale data is shown immediately while fresh data is fetched
 * - Banner notification shown during revalidation
 */

const CACHE_KEY = 'mostudy-user-cache';
const CACHE_TTL_MS = 15 * 1000; // 15 seconds

/**
 * Default user data structure (matches backend schema)
 */
const DEFAULT_USER_DATA = {
  theme: 'light',
  stats: {
    totalQuizzesCompleted: 0,
    totalRoleplaysCompleted: 0,
    averageQuizScore: 0,
    averageRoleplayScore: 0,
    lastActivityAt: null
  },
  quizSummaries: [],
  roleplaySummaries: []
};

/**
 * Get cached user data from localStorage.
 * Returns null if no cache exists.
 */
function getCachedUserData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached || !cached.data || !cached.timestamp) return null;

    return cached;
  } catch (e) {
    console.warn('Failed to read user cache:', e);
    return null;
  }
}

/**
 * Save user data to localStorage cache with current timestamp.
 */
function setCachedUserData(data) {
  try {
    const cacheEntry = {
      data: data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (e) {
    console.warn('Failed to write user cache:', e);
  }
}

/**
 * Clear the user data cache.
 * Call this on logout.
 */
function clearUserCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear user cache:', e);
  }
}

/**
 * Check if the cache is stale (older than TTL).
 */
function isCacheStale(cached) {
  if (!cached || !cached.timestamp) return true;
  return (Date.now() - cached.timestamp) > CACHE_TTL_MS;
}

/**
 * Get the age of the cache in seconds.
 */
function getCacheAge(cached) {
  if (!cached || !cached.timestamp) return Infinity;
  return Math.round((Date.now() - cached.timestamp) / 1000);
}

// ==================== REVALIDATION BANNER ====================

let revalidationBanner = null;

/**
 * Show a non-blocking banner indicating data is being refreshed.
 */
function showRevalidationBanner() {
  if (revalidationBanner) return; // Already showing

  revalidationBanner = document.createElement('div');
  revalidationBanner.id = 'revalidation-banner';
  revalidationBanner.className = 'revalidation-banner';
  revalidationBanner.innerHTML = `
    <div class="revalidation-banner-content">
      <svg class="revalidation-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      </svg>
      <span>Refreshing data...</span>
    </div>
  `;
  document.body.appendChild(revalidationBanner);

  // Trigger animation
  requestAnimationFrame(() => {
    revalidationBanner.classList.add('visible');
  });
}

/**
 * Hide the revalidation banner.
 */
function hideRevalidationBanner() {
  if (!revalidationBanner) return;

  revalidationBanner.classList.remove('visible');
  revalidationBanner.classList.add('hiding');

  setTimeout(() => {
    if (revalidationBanner && revalidationBanner.parentNode) {
      revalidationBanner.parentNode.removeChild(revalidationBanner);
    }
    revalidationBanner = null;
  }, 300);
}

// ==================== MAIN API ====================

/**
 * Fetch user data with stale-while-revalidate pattern.
 * 
 * @param {Function} getToken - Async function that returns the auth token
 * @param {Object} options - Configuration options
 * @param {Function} options.onData - Callback when data is available (may be called twice: stale then fresh)
 * @param {Function} options.onError - Callback when fetch fails
 * @param {boolean} options.forceRefresh - Skip cache and always fetch fresh data
 * @returns {Promise<Object>} The user data (either cached or fresh)
 */
async function fetchUserDataWithCache(getToken, options = {}) {
  const { onData, onError, forceRefresh = false } = options;

  const cached = getCachedUserData();
  const hasCache = cached && cached.data;
  const isStale = isCacheStale(cached);

  // If we have fresh cache and not forcing refresh, return immediately
  if (hasCache && !isStale && !forceRefresh) {
    if (onData) onData(cached.data, { fromCache: true, isStale: false });
    return cached.data;
  }

  // If we have stale cache, show it immediately while fetching fresh data
  if (hasCache && isStale && !forceRefresh) {
    if (onData) onData(cached.data, { fromCache: true, isStale: true });
    showRevalidationBanner();
  }

  // Fetch fresh data
  try {
    const token = await getToken();
    if (!token) {
      // Not authenticated, return defaults
      hideRevalidationBanner();
      const defaults = { ...DEFAULT_USER_DATA };
      if (onData) onData(defaults, { fromCache: false, isStale: false });
      return defaults;
    }

    const response = await fetch('/api/user-data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const freshData = await response.json();

    // Update cache
    setCachedUserData(freshData);

    // Notify with fresh data
    if (onData) onData(freshData, { fromCache: false, isStale: false });

    hideRevalidationBanner();
    return freshData;

  } catch (error) {
    console.error('Failed to fetch user data:', error);
    hideRevalidationBanner();

    if (onError) onError(error);

    // If we had cached data, keep using it
    if (hasCache) {
      return cached.data;
    }

    // Return defaults as last resort
    return { ...DEFAULT_USER_DATA };
  }
}

/**
 * Save a report and update the cache with the returned data.
 * 
 * @param {Function} getToken - Async function that returns the auth token
 * @param {string} type - 'quiz' or 'roleplay'
 * @param {Object} reportData - The report data to save
 * @returns {Promise<Object>} The updated user data from the server
 */
async function saveReportAndUpdateCache(getToken, type, reportData) {
  const token = await getToken();
  if (!token) {
    console.warn('Cannot save report: not authenticated');
    return null;
  }

  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type, data: reportData })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to save report: ${response.status}`);
  }

  const updatedData = await response.json();

  // The server returns the full updated user data, update cache
  if (updatedData && updatedData.success !== false) {
    setCachedUserData(updatedData);
  }

  return updatedData;
}

/**
 * Update user preferences (theme) and update the cache.
 * 
 * @param {Function} getToken - Async function that returns the auth token
 * @param {Object} preferences - The preferences to update (e.g., { theme: 'dark' })
 * @returns {Promise<Object>} The updated preferences from the server
 */
async function updatePreferencesAndCache(getToken, preferences) {
  const token = await getToken();
  if (!token) {
    console.warn('Cannot update preferences: not authenticated');
    return null;
  }

  const response = await fetch('/api/user-data', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update preferences: ${response.status}`);
  }

  const updatedPrefs = await response.json();

  // Update the theme in the cached data
  const cached = getCachedUserData();
  if (cached && cached.data) {
    cached.data.theme = updatedPrefs.theme;
    setCachedUserData(cached.data);
  }

  return updatedPrefs;
}

// ==================== EXPORTS (Global) ====================

// Expose globally for use across the app
window.MoStudyCache = {
  // Core cache operations
  getCachedUserData,
  setCachedUserData,
  clearUserCache,
  isCacheStale,
  getCacheAge,

  // High-level API
  fetchUserDataWithCache,
  saveReportAndUpdateCache,
  updatePreferencesAndCache,

  // Banner control (for manual use if needed)
  showRevalidationBanner,
  hideRevalidationBanner,

  // Constants
  DEFAULT_USER_DATA,
  CACHE_TTL_MS
};
