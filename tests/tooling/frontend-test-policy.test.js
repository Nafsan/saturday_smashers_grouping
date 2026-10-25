import {
    normalizePath, companionTests, parseArguments, planTests, resolveRepositoryPath,
} from '../../scripts/frontend-test-policy.mjs';

const available = new Set(['src/logic/ranking.js', 'src/logic/ranking.test.js',
    'src/components/Example.jsx', 'src/components/Example.test.jsx',
    'src/components/Example.scss', 'package.json', 'tests/frontend/setup.js']);
const exists = file => available.has(file);

test('normalizes Windows paths and proposes colocated test extensions', () => {
    expect(normalizePath('.\\src\\logic\\ranking.js')).toBe('src/logic/ranking.js');
    expect(companionTests('src/components/Example.jsx')).toContain('src/components/Example.test.jsx');
});

test.each(['changed', 'check'])('parses %s and an explicit base', mode => {
    expect(parseArguments([mode, '--base', 'origin/main'])).toEqual({ mode, base: 'origin/main', files: [] });
});

test('parses explicit related paths', () => {
    expect(parseArguments(['related', 'src\\logic\\ranking.js']).files).toEqual(['src/logic/ranking.js']);
});

test('accepts a positional Git ref through Windows npm', () => {
    expect(parseArguments(['check', 'origin/main'])).toEqual({ mode: 'check', base: 'origin/main', files: [] });
});

test.each([[], ['unknown'], ['related'], ['check', '--base'], ['check', '--wat'], ['changed', 'ref1', 'ref2']])(
    'rejects malformed arguments %j', (...args) => {
        expect(() => parseArguments(args)).toThrow();
    },
);

test('selects related tests and includes untracked source files', () => {
    const plan = planTests(['src/logic/ranking.js', 'src/logic/ranking.js', 'backend/main.py'], { exists });
    expect(plan.changed).toEqual(['src/logic/ranking.js']);
    expect(plan.args).toEqual(['--runInBand', '--findRelatedTests', 'src/logic/ranking.js']);
});

test('rejects a changed module without its own test', () => {
    expect(() => planTests(['src/new.js'], { exists: file => file === 'src/new.js' })).toThrow('Add colocated tests');
});

test('does not require test files to have companion tests', () => {
    expect(planTests(['src/logic/ranking.test.js'], { exists }).sources).toEqual([]);
});

test.each(['package.json', 'tests/frontend/setup.js', 'src/deleted.js'])('runs all tests for %s', file => {
    expect(planTests([file], { exists }).fullSuite).toBe(true);
});

test('uses separate thresholds for every changed module', () => {
    const plan = planTests(['src/logic/ranking.js', 'src/components/Example.jsx'], { exists, check: true });
    const argument = plan.args.find(arg => arg.startsWith('--coverageThreshold='));
    const thresholds = JSON.parse(argument.split('=')[1]);
    expect(thresholds['./src/logic/ranking.js'].lines).toBe(80);
    expect(thresholds['./src/components/Example.jsx'].branches).toBe(70);
    expect(plan.args).toContain('--coverage');
});

test('style changes run related component tests without demanding a CSS unit test', () => {
    const plan = planTests(['src/components/Example.scss'], { exists });
    expect(plan.args).toContain('--findRelatedTests');
    expect(plan.args).toContain('src/components/Example.jsx');
});

test('ignores backend and documentation changes', () => {
    expect(planTests(['backend/main.py', 'README.md', 'src/AGENTS.md'], { exists }).changed).toEqual([]);
});

test('allows repository paths and rejects traversal', () => {
    expect(resolveRepositoryPath(process.cwd(), 'src/logic/ranking.js')).toBe('src/logic/ranking.js');
    expect(() => resolveRepositoryPath(process.cwd(), '../outside.js')).toThrow('inside this repository');
});
