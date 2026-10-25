import path from 'node:path';

export const normalizePath = file => file.replaceAll('\\', '/').replace(/^\.\//, '');
export const isTest = file => /\.test\.[jt]sx?$/.test(file);
export const isSource = file => /^src\/.*\.[jt]sx?$/.test(file) && !isTest(file);
export const isFrontendFile = file => /^src\/.*\.(?:[jt]sx?|css|scss|sass|json|png|jpe?g|svg|webp)$/.test(file)
    || /^(tests\/.*\.[cm]?[jt]sx?$|scripts\/.*\.[cm]?[jt]s$)/.test(file)
    || /^(package(-lock)?\.json|jest\.config\.cjs|babel\.config\.cjs|vite\.config\.js)$/.test(file);

export const companionTests = file => {
    const stem = file.replace(/\.[jt]sx?$/, '');
    return [`${stem}.test.js`, `${stem}.test.jsx`, `${stem}.test.ts`, `${stem}.test.tsx`];
};

export function parseArguments(args) {
    const [mode, ...remaining] = args;
    if (!['changed', 'check', 'related'].includes(mode)) {
        throw new Error('Use changed, check, or related followed by source/test paths.');
    }
    let base = 'HEAD';
    const files = [];
    for (let i = 0; i < remaining.length; i++) {
        if (remaining[i] === '--base') {
            if (!remaining[i + 1] || remaining[i + 1].startsWith('-')) throw new Error('--base requires a Git ref.');
            base = remaining[++i];
        } else if (remaining[i].startsWith('-')) {
            throw new Error(`Unknown option: ${remaining[i]}`);
        } else {
            files.push(normalizePath(remaining[i]));
        }
    }
    if (mode === 'related' && files.length === 0) throw new Error('Provide at least one changed source or test file.');
    // A positional ref works through Windows npm/PowerShell, which can consume
    // named flags before forwarding arguments to package scripts.
    if (mode !== 'related' && files.length) {
        if (files.length !== 1 || base !== 'HEAD') throw new Error('Provide one Git base ref, or use related for explicit files.');
        base = files.pop();
    }
    return { mode, base, files };
}

export function planTests(files, { exists, check = false }) {
    const changed = [...new Set(files.map(normalizePath))].filter(isFrontendFile);
    const styleSources = changed.filter(file => /\.(css|scss|sass)$/.test(file))
        .flatMap(file => [file.replace(/\.[^.]+$/, '.jsx'), file.replace(/\.[^.]+$/, '.js')])
        .filter(exists);
    const sources = changed.filter(file => isSource(file) && exists(file));
    const missing = [...new Set([...sources, ...styleSources])].filter(file => !companionTests(file).some(exists));
    if (missing.length) throw new Error(`Add colocated tests before continuing:\n${missing.join('\n')}`);

    const fullSuite = changed.some(file => !exists(file)
        || /^(package(-lock)?\.json|.*\.config\.[cm]?js|scripts\/|tests\/frontend\/|src\/(main|App)\.)/.test(file)
        || /^src\/(styles|data)\//.test(file));
    const args = ['--runInBand'];
    if (!fullSuite && changed.length) args.push('--findRelatedTests', ...new Set([...changed, ...styleSources]));
    if (check) {
        args.push('--coverage');
        if (sources.length) {
            // Each file has its own threshold; a well-tested file cannot mask another.
            const thresholds = Object.fromEntries(sources.map(file => [`./${file}`, {
                statements: 80, branches: 70, functions: 80, lines: 80,
            }]));
            args.push(`--coverageThreshold=${JSON.stringify(thresholds)}`);
        }
    }
    return { changed, sources, fullSuite, args };
}

export function resolveRepositoryPath(root, file) {
    const resolved = path.resolve(root, file);
    const relative = path.relative(root, resolved);
    if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
        throw new Error(`Path must be inside this repository: ${file}`);
    }
    return normalizePath(relative);
}
