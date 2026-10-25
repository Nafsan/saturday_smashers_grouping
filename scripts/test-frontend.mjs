import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isFrontendFile, parseArguments, planTests, resolveRepositoryPath } from './frontend-test-policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

function git(args) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Git command failed');
    return result.stdout;
}

try {
    const options = parseArguments(process.argv.slice(2));
    let files;
    if (options.mode === 'related') {
        files = options.files.map(file => resolveRepositoryPath(root, file));
        for (const file of files) {
            if (!isFrontendFile(file)) throw new Error(`Not a frontend source or test file: ${file}`);
            if (!existsSync(path.join(root, file))) throw new Error(`File does not exist: ${file}`);
        }
    } else {
        const base = options.base === 'HEAD' ? 'HEAD' : git(['merge-base', options.base, 'HEAD']).trim();
        files = [
            ...git(['diff', '--name-only', '--no-renames', '-z', base, '--']).split('\0'),
            ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
        ].filter(Boolean);
    }
    const plan = planTests(files, {
        exists: file => existsSync(path.join(root, file)),
        check: options.mode === 'check',
    });
    if (plan.changed.length === 0) {
        console.log('No frontend changes found. Use --base REF to include committed branch changes.');
    } else {
        console.log(`Frontend changes (${plan.changed.length}):\n${plan.changed.join('\n')}`);
        console.log(plan.fullSuite ? 'Running the full frontend suite.' : 'Running tests related to these files.');
        const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), ...plan.args], {
            cwd: root, stdio: 'inherit',
        });
        if (result.error) throw result.error;
        process.exitCode = result.status ?? 1;
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
