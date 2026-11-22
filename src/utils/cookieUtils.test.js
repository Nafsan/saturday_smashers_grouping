import { setThemeCookie, getThemeCookie, isAdminAuthenticated } from './cookieUtils';

test('persists theme independently from authentication and ignores unrelated cookies', () => {
    document.cookie = 'unrelated=value;path=/';
    expect(getThemeCookie()).toBeNull();
    setThemeCookie('light');
    expect(getThemeCookie()).toBe('light');
    setThemeCookie('dark');
    expect(getThemeCookie()).toBe('dark');
});

test('loads authentication from the server session instead of a password cookie', async () => {
    const { refreshAdminSession, isAdminAuthenticated } = require('./cookieUtils');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ authenticated: true }) });
    await refreshAdminSession();
    expect(isAdminAuthenticated()).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/session'), expect.any(Object));
});

test('logout revokes the server session', async () => {
    const { logoutAdmin } = require('./cookieUtils');
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    await logoutAdmin();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.objectContaining({ method: 'POST' }));
});

test('a legacy password cookie does not grant admin status', async () => {
    const { refreshAdminSession, isAdminAuthenticated } = require('./cookieUtils');
    document.cookie = 'ss_admin_auth=test-admin-only;path=/';
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await refreshAdminSession();
    expect(isAdminAuthenticated()).toBe(false);
});

test('does not expose legacy password-cookie helpers', () => {
    const utilities = require('./cookieUtils');
    expect(utilities).not.toHaveProperty('getAdminAuthCookie');
    expect(utilities).not.toHaveProperty('setAdminAuthCookie');
});
