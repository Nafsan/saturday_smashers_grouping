/** @jest-environment-options {"url":"https://smashers.example/"} */
import { setThemeCookie } from './cookieUtils';

test('production cookies include Secure and remain usable over HTTPS', () => {
    const setter = jest.spyOn(document, 'cookie', 'set');
    setThemeCookie('light');
    expect(setter).toHaveBeenLastCalledWith(expect.stringContaining('; Secure'));
});
