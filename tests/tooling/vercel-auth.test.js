const fs = require('fs');
const path = require('path');

test('proxies same-origin API calls to the backend', () => {
    const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));
    expect(config.rewrites).toContainEqual({ source: '/api/:path*', destination: 'https://saturday-smashers-grouping-api.onrender.com/:path*' });
});

test('deployment does not inject the old shared password', () => {
    const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/deploy.yml'), 'utf8');
    expect(workflow).not.toContain('VITE_ADMIN_PASSWORD');
});

test('Vite forwards local API requests to the backend without the /api prefix', () => {
    const { execFileSync } = require('child_process');
    const script = `import config from './vite.config.js';
      const proxy = config.server?.proxy?.['/api'];
      console.log(JSON.stringify({ target: proxy?.target, path: proxy?.rewrite?.('/api/players') }));`;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: process.cwd(), encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual({ target: 'http://127.0.0.1:8000', path: '/players' });
});

test('ignores generated Playwright reports', () => {
    const ignored = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
    expect(ignored).toMatch(/^test-results\/$/m);
    expect(ignored).toMatch(/^playwright-report\/$/m);
});
