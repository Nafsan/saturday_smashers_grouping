import { parseNationalRankingHTML } from './nationalRankingParser';

test('extracts ranking table headers, trims names and converts numeric data', () => {
    const html = '<figure class="wp-block-table"><table><tr><td>Rank</td><td>Name</td><td>Points</td></tr><tr><td>1</td><td> Alice </td><td>123.5</td></tr><tr><td>2</td><td>Bob</td><td></td><td>Extra</td></tr></table></figure>';
    expect(parseNationalRankingHTML(html)).toEqual([
        { Rank: 1, Name: 'Alice', Points: 123.5 }, { Rank: 2, Name: 'Bob', Points: '', col_3: 'Extra' },
    ]);
});

test.each(['', '<table><tr><td>Unrelated</td></tr></table>', '<figure class="wp-block-table"><table><tr><td>Rank</td></tr></table></figure>'])(
    'returns an empty list when there is no ranking data', html => expect(parseNationalRankingHTML(html)).toEqual([]),
);
