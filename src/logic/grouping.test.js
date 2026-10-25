import { generateGroups } from './grouping';

describe('generateGroups', () => {
    test('snake distributes top seeds and reverses direction at each end', () => {
        expect(generateGroups([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({ groupA: [1, 4, 5, 8], groupB: [2, 3, 6, 7] });
    });
    test('supports more than two groups and uneven attendance without losing players', () => {
        expect(generateGroups([1, 2, 3, 4, 5, 6, 7], 3)).toEqual({ groupA: [1, 6, 7], groupB: [2, 5], groupC: [3, 4] });
    });
    test.each([1, 2, 4])('creates %i empty groups for an empty roster', count => {
        expect(Object.values(generateGroups([], count))).toEqual(Array.from({ length: count }, () => []));
    });
    test('one group contains every player in order', () => {
        expect(generateGroups(['A', 'B', 'C'], 1)).toEqual({ groupA: ['A', 'B', 'C'] });
    });
    test('random distribution assigns one player per tier to each group and preserves its input', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.75);
        const players = Array.from({ length: 7 }, (_, index) => ({ name: `P${index}` }));
        const before = [...players];
        const groups = Object.values(generateGroups(players, 3, 'random'));
        expect(groups.flat()).toHaveLength(7);
        expect(new Set(groups.flat())).toEqual(new Set(players));
        expect(players).toEqual(before);
        for (const group of groups) {
            const tiers = group.map(player => Math.floor(players.indexOf(player) / 3));
            expect(new Set(tiers).size).toBe(group.length);
        }
    });
});
