import { getPlayersFromResult, getPlayerRank } from './clubTournamentConstants';

const result = { champion: 'Alice', runner_up: 'Bob', semi_finalist_1: 'Carol', semi_finalist_2: 'Dave',
    quarter_finalist_1: 'Eve', quarter_finalist_2: 'Frank', quarter_finalist_3: 'Grace', quarter_finalist_4: 'Helen' };

test('lists result players in finishing order, omitting optional entries', () => {
    expect(getPlayersFromResult(result)).toEqual(['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Helen']);
    expect(getPlayersFromResult({ champion: 'Alice', quarter_finalist_1: null })).toEqual(['Alice']);
    expect(getPlayersFromResult(null)).toEqual([]);
});
test.each([['Alice', 'Champion'], ['Bob', 'Runner Up'], ['Carol', 'Semi Finalist'], ['Dave', 'Semi Finalist'],
    ['Eve', 'Quarter Finalist'], ['Frank', 'Quarter Finalist'], ['Grace', 'Quarter Finalist'], ['Helen', 'Quarter Finalist'],
    ['Unknown', null], ['', null]])('finds rank for %s', (name, rank) => expect(getPlayerRank(result, name)).toBe(rank));
test('absent results have no rank', () => expect(getPlayerRank(null, 'Alice')).toBeNull());
