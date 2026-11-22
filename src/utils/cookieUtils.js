/**
 * Cookie utility functions for managing admin authentication
 * Supports both development (http) and production (https) environments
 */

const COOKIE_NAME = 'ss_admin_auth';

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
 * Clear admin authentication cookie
 */
const clearLegacyAdminCookie = () => {
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

const THEME_COOKIE_NAME = 'ss_theme';
const THEME_EXPIRY_DAYS = 3650; // ~10 years (Browser max is usually ~400 days but this ensures maximum persistence)

/**
 * Set theme cookie
 * @param {string} theme - 'light' or 'dark'
 */
export const setThemeCookie = (theme) => {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (THEME_EXPIRY_DAYS * 24 * 60 * 60 * 1000));

    const expires = `expires=${expiryDate.toUTCString()}`;
    const sameSite = 'SameSite=Lax';
    const secure = isDevelopment() ? '' : 'Secure';

    const cookieParts = [
        `${THEME_COOKIE_NAME}=${theme}`,
        expires,
        sameSite,
        'path=/'
    ];

    if (secure) cookieParts.push(secure);
    document.cookie = cookieParts.join('; ');
};

/**
 * Get theme from cookie
 * @returns {string|null}
 */
export const getThemeCookie = () => {
    const name = THEME_COOKIE_NAME + '=';
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
 * Check the most recently verified server session
 * @returns {boolean}
 */
export const isAdminAuthenticated = () => serverSessionActive;

// Session status is only a UI hint; the server authorizes each write.
let serverSessionActive = false;
export const refreshAdminSession = async () => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/session`, { credentials: 'same-origin' });
        serverSessionActive = response.ok && (await response.json()).authenticated === true;
    } catch {
        serverSessionActive = false;
    }
    window.dispatchEvent(new Event('authStatusChanged'));
    return serverSessionActive;
};

export const logoutAdmin = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/logout`, { method: 'POST', credentials: 'same-origin' });
    if (!response.ok) throw new Error('Could not sign out');
    serverSessionActive = false;
    clearLegacyAdminCookie();
    window.dispatchEvent(new Event('authStatusChanged'));
};
