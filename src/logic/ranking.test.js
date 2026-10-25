import { calculateRankings, getAllPlayers } from './ranking';

const tournament = (date, ratings, is_official = true) => ({ date, is_official,
    ranks: Object.entries(ratings).map(([name, rating]) => ({ rank: 99, rating, players: [name] })),
});

test('only official results contribute; ratings determine ranks rather than raw placement', () => {
    const history = [tournament('2026-10-24', { Alice: 1, Bob: 5 }), tournament('2026-10-25', { Alice: 8 }, false)];
    expect(calculateRankings(history, ['Alice', 'Bob']).map(p => [p.name, p.average, p.playedCount])).toEqual([
        ['Alice', 1, 1], ['Bob', 5, 1],
    ]);
});

test('averages the latest five results, counts all attendance, and leaves history untouched', () => {
    const history = [1, 2, 3, 4, 5, 8].map((rating, i) => tournament(`2026-10-${25 - i}`, { Alice: rating }));
    history.reverse();
    const before = JSON.stringify(history);
    const [alice] = calculateRankings(history, ['Alice']);
    expect(alice.average).toBe(3);
    expect(alice.weightedAverage).toBeCloseTo(7 / 3);
    expect(alice.bestRating).toBe(1);
    expect(alice.playedCount).toBe(6);
    expect(alice.ranks).toEqual([1, 2, 3, 4, 5, 8]);
    expect(JSON.stringify(history)).toBe(before);
});

test('temporary seeding overrides history and keeps new players behind established ones', () => {
    const result = calculateRankings([tournament('2026-10-24', { Alice: 8 })], [{ name: 'Alice' }, 'Bob'], [{ name: 'Alice', initialRank: 2 }]);
    expect(result[0]).toMatchObject({ name: 'Alice', isTemporary: true, average: 2, playedCount: 0 });
    expect(result[1]).toMatchObject({ name: 'Bob', average: 1000, bestRating: 1000 });
});

test('equal averages favor recent performance', () => {
    const history = [tournament('2026-10-24', { Alice: 1, Bob: 3 }), tournament('2026-10-17', { Alice: 3, Bob: 1 })];
    expect(calculateRankings(history, ['Bob', 'Alice']).map(p => p.name)).toEqual(['Alice', 'Bob']);
});

test('attendance breaks an otherwise equal tie; names break the final tie', () => {
    const history = [tournament('2026-10-24', { Alice: 2, Bob: 2 }), tournament('2026-10-17', { Bob: 2 })];
    expect(calculateRankings(history, ['Alice', 'Bob']).map(p => p.name)).toEqual(['Bob', 'Alice']);
    expect(calculateRankings([], ['Zara', 'Alice']).map(p => p.name)).toEqual(['Alice', 'Zara']);
});

test('best recent performance breaks a tie in both average and weighted average', () => {
    const history = [1, 4, 1].map((rating, i) => tournament(`2026-10-${24 - i}`, { Alice: rating, Bob: 2 }));
    expect(calculateRankings(history, ['Bob', 'Alice']).map(p => p.name)).toEqual(['Alice', 'Bob']);
});

test('inactive players are excluded and empty selection is valid', () => {
    const history = [tournament('2026-10-24', { Alice: 1, Bob: 2 })];
    expect(calculateRankings(history, [])).toEqual([]);
    expect(calculateRankings(history, ['Bob'])).toHaveLength(1);
});

test('getAllPlayers returns sorted distinct names across results', () => {
    expect(getAllPlayers([tournament('2026-10-24', { Bob: 1, Alice: 2 }), tournament('2026-10-17', { Alice: 1, Carol: 3 })])).toEqual(['Alice', 'Bob', 'Carol']);
    expect(getAllPlayers([])).toEqual([]);
});
