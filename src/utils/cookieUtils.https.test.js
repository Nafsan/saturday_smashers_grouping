/** @jest-environment-options {"url":"https://smashers.example/"} */
import { setAdminAuthCookie, clearAdminAuthCookie, setThemeCookie, getAdminAuthCookie } from './cookieUtils';

test('production cookies include Secure and remain usable over HTTPS', () => {
    const setter = jest.spyOn(document, 'cookie', 'set');
    setAdminAuthCookie('test');
    expect(getAdminAuthCookie()).toBe('test');
    expect(setter).toHaveBeenLastCalledWith(expect.stringContaining('; Secure'));
    setThemeCookie('light');
    expect(setter).toHaveBeenLastCalledWith(expect.stringContaining('; Secure'));
    clearAdminAuthCookie();
    expect(setter).toHaveBeenLastCalledWith(expect.stringContaining('; Secure'));
    expect(getAdminAuthCookie()).toBeNull();
});
