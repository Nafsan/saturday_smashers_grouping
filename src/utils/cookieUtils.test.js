import { setAdminAuthCookie, getAdminAuthCookie, clearAdminAuthCookie, setThemeCookie, getThemeCookie, isAdminAuthenticated } from './cookieUtils';

test('round trips an encoded password, authenticates, and clears it', () => {
    expect(getAdminAuthCookie()).toBeNull();
    expect(isAdminAuthenticated()).toBe(false);
    setAdminAuthCookie('spaces & symbols=');
    expect(getAdminAuthCookie()).toBe('spaces & symbols=');
    expect(isAdminAuthenticated()).toBe(false);
    setAdminAuthCookie('test-admin-only');
    expect(isAdminAuthenticated()).toBe(true);
    clearAdminAuthCookie();
    expect(getAdminAuthCookie()).toBeNull();
});
test('persists theme independently from authentication and ignores unrelated cookies', () => {
    document.cookie = 'unrelated=value;path=/';
    expect(getThemeCookie()).toBeNull();
    setThemeCookie('light');
    expect(getThemeCookie()).toBe('light');
    expect(getAdminAuthCookie()).toBeNull();
    setThemeCookie('dark');
    expect(getThemeCookie()).toBe('dark');
});
test('sets cookie expiry, root path and SameSite attributes without requiring HTTPS in development', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-25T12:00:00Z'));
    const setter = jest.spyOn(document, 'cookie', 'set');
    setAdminAuthCookie('test');
    expect(setter).toHaveBeenLastCalledWith(expect.stringContaining('expires=Tue, 24 Nov 2026'));
    expect(setter).toHaveBeenLastCalledWith(expect.stringContaining('SameSite=Lax; path=/'));
    expect(setter.mock.calls.at(-1)[0]).not.toContain('Secure');
});
test('authentication honors the fallback password when no configured test password exists', () => {
    const previous = process.env.VITE_ADMIN_PASSWORD;
    delete process.env.VITE_ADMIN_PASSWORD;
    try {
        setAdminAuthCookie('ss_admin_panel');
        expect(isAdminAuthenticated()).toBe(true);
    } finally {
        process.env.VITE_ADMIN_PASSWORD = previous;
    }
});
