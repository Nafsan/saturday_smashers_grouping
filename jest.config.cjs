const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = {
    testEnvironment: 'jsdom',
    testEnvironmentOptions: { url: 'http://localhost/' },
    testMatch: ['<rootDir>/src/**/*.test.[jt]s?(x)', '<rootDir>/tests/**/*.test.[jt]s?(x)'],
    testPathIgnorePatterns: ['/node_modules/', '/backend/', '/dist/', '/dev-dist/'],
    transform: { '^.+\\.[cm]?[jt]sx?$': 'babel-jest' },
    moduleNameMapper: {
        '\\.(css|scss|sass)$': 'identity-obj-proxy',
        '\\.(png|jpe?g|gif|svg|webp|woff2?)$': '<rootDir>/tests/frontend/fileMock.cjs',
    },
    setupFilesAfterEnv: ['<rootDir>/tests/frontend/setup.js'],
    clearMocks: true,
    restoreMocks: true,
    verbose: true,
    // Avoid cache folders created under a different Windows security context.
    cacheDirectory: path.join(os.tmpdir(), `saturday-smashers-jest-${randomUUID()}`),
    collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/**/*.test.{js,jsx}'],
    coverageDirectory: 'coverage/frontend',
    coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
    coverageThreshold: {
        './src/logic/': { statements: 90, branches: 80, functions: 90, lines: 90 },
        './src/utils/': { statements: 90, branches: 80, functions: 90, lines: 90 },
        './src/api/client.js': { statements: 95, branches: 90, functions: 100, lines: 95 },
        './src/store/appSlice.js': { statements: 90, branches: 80, functions: 90, lines: 90 },
        ...Object.fromEntries([
            'ManagePlayers', 'LoginDialog', 'PasswordDialog', 'ThemeToggle', 'VideoGrid',
            'VideoPlayer', 'HeroSection', 'SmartDateRangeSelector', 'UnofficialTournamentDialog',
        ].map(name => [`./src/components/${name}.jsx`, { statements: 80, branches: 70, functions: 80, lines: 80 }])),
        './src/context/ToastContext.jsx': { statements: 90, branches: 70, functions: 90, lines: 90 },
    },
};
