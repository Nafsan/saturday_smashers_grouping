import { parseRankText } from './parser';

test.each(['24/10/2026', '2026-10-24'])('parses %s with tied players and dynamic rank numbers', date => {
    expect(parseRankText(`${date}\n1. Alice\n2. Bob\n3. Carol and Dave\n5. Eve, Frank\nnot a placement`)).toEqual({
        id: 't_2026_10_24', date: '2026-10-24', ranks: [
            { rank: 1, rating: 1, players: ['Alice'] }, { rank: 2, rating: 2, players: ['Bob'] },
            { rank: 3, rating: 3, players: ['Carol', 'Dave'] }, { rank: 5, rating: 4, players: ['Eve', 'Frank'] },
        ],
    });
});

test.each(['', '2026-10-24', null, '24/10/26\n1. Alice'])('returns null for incomplete or malformed input %j', input => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(parseRankText(input)).toBeNull();
});

test('uses today for an unparseable textual date and reports the fallback', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-25T12:00:00Z'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseRankText('unknown date\n1. Alice').date).toBe('2026-10-25');
    expect(warn).toHaveBeenCalled();
});

test('skips blank lines and empty names', () => {
    expect(parseRankText('2026-10-24\n\n1. Alice, , Bob\n').ranks[0].players).toEqual(['Alice', 'Bob']);
});
