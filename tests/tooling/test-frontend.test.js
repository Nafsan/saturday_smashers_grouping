import { spawnSync } from 'node:child_process';
import path from 'node:path';

test.each([
    [['related'], 'Provide at least one'],
    [['related', 'src/missing.jsx'], 'File does not exist'],
    [['related', '../outside.js'], 'Path must be inside'],
    [['related', 'README.md'], 'Not a frontend'],
    [['changed', '--unknown'], 'Unknown option'],
])('the CLI fails clearly for %j', (args, message) => {
    const result = spawnSync(process.execPath, [path.join(process.cwd(), 'scripts/test-frontend.mjs'), ...args], {
        cwd: process.cwd(), encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(message);
});
