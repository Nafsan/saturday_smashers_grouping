/**
 * Cookie utility functions for managing admin authentication
 * Supports both development (http) and production (https) environments
 */

const COOKIE_NAME = 'ss_admin_auth';
const COOKIE_EXPIRY_DAYS = 30;

/**
 * Check if running in development mode
 * @returns {boolean}
 */
const isDevelopment = () => {
    return window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'http:';
};

/**
 * Set admin authentication cookie
 * @param {string} password - Admin password to store
 */
export const setAdminAuthCookie = (password) => {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));

    const expires = `expires=${expiryDate.toUTCString()}`;
    const sameSite = 'SameSite=Lax';

    // Only use secure flag in production (https)
    const secure = isDevelopment() ? '' : 'Secure';

    // Build cookie string
    const cookieParts = [
        `${COOKIE_NAME}=${encodeURIComponent(password)}`,
        expires,
        sameSite,
        'path=/'
    ];

    // Add secure flag only in production
    if (secure) {
        cookieParts.push(secure);
    }

    document.cookie = cookieParts.join('; ');

    console.log('[Cookie Debug] Set cookie:', document.cookie);
};

/**
 * Get admin authentication cookie value
 * @returns {string|null} - Admin password or null if not found
 */
export const getAdminAuthCookie = () => {
    const name = COOKIE_NAME + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return null;
};

/**
 * Clear admin authentication cookie
 */
export const clearAdminAuthCookie = () => {
    const secure = isDevelopment() ? '' : 'Secure';

    // Build cookie string
    const cookieParts = [
        `${COOKIE_NAME}=`,
        'expires=Thu, 01 Jan 1970 00:00:00 UTC',
        'path=/'
    ];

    // Add secure flag only in production
    if (secure) {
        cookieParts.push(secure);
    }

    document.cookie = cookieParts.join('; ');
};

/**
 * Check if admin is authenticated (cookie exists)
 * @returns {boolean}
 */
export const isAdminAuthenticated = () => {
    return getAdminAuthCookie() !== null;
};
