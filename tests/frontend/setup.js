import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

process.env.VITE_API_URL = 'http://localhost:8000';
process.env.VITE_ADMIN_PASSWORD = 'test-admin-only';

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn(query => ({
        matches: false, media: query, onchange: null,
        addListener: jest.fn(), removeListener: jest.fn(),
        addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
    })),
});

beforeEach(() => {
    // A forgotten mock must fail locally, rather than make an external request.
    global.fetch = jest.fn(() => { throw new Error('Mock fetch before making a network request'); });
    jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {
        throw new Error('Mock the API client before making a network request');
    });
});

afterEach(() => {
    cleanup();
    for (const cookie of document.cookie.split(';')) {
        document.cookie = `${cookie.split('=')[0].trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
    jest.useRealTimers();
});
