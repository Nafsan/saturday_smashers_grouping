import { generateKnockoutFixtures } from './knockout';

test.each([[10, 5, 3], [12, 5, 5], [14, 7, 5], [16, 7, 7]])(
    '%i players have the expected cup/plate match counts and valid advancement', (count, cupCount, plateCount) => {
        const fixtures = generateKnockoutFixtures(count);
        for (const [bracket, expected] of [['cup', cupCount], ['plate', plateCount]]) {
            const matches = fixtures[bracket].flatMap(round => round.matches);
            expect(matches).toHaveLength(expected);
            const seen = new Set();
            for (const match of matches) {
                expect(seen.has(match.id)).toBe(false);
                for (const player of [match.p1, match.p2]) {
                    const previous = player.match(/^Winner (\w+)/)?.[1];
                    if (previous) expect(seen.has(previous)).toBe(true);
                }
                seen.add(match.id);
            }
            expect(fixtures[bracket].at(-1).round).toBe('Final');
        }
    },
);

test('sixteen-player plate uses group positions 5–8 and opposite groups', () => {
    expect(generateKnockoutFixtures(16).plate[0].matches.map(({ p1, p2 }) => [p1, p2])).toEqual([
        ['A5', 'B8'], ['A6', 'B7'], ['A7', 'B6'], ['A8', 'B5'],
    ]);
});

test.each([0, 8, 11, 18])('unsupported player count %i returns empty brackets', count => {
    expect(generateKnockoutFixtures(count)).toEqual({ cup: [], plate: [] });
});

test('successive fixture calls are independent', () => {
    const first = generateKnockoutFixtures(12);
    first.cup[0].matches.pop();
    expect(generateKnockoutFixtures(12).cup[0].matches).toHaveLength(2);
});
