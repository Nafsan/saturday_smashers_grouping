import axios from 'axios';
import client, * as api from './client';

jest.mock('axios', () => ({ create: jest.fn(() => ({
    get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
})) }));

const data = { value: 'payload' };
const password = 'test-password';
const auth = { params: { password } };
const cases = [
    ['fetchHistory', [], 'get', ['/history']],
    ['addTournament', [data, password], 'post', ['/history', data, auth]],
    ['updateTournament', [7, data, password], 'put', ['/history/7', data, auth]],
    ['updateUnofficialTournamentDetails', [7, data, password], 'patch', ['/history/7/unofficial-details', data, auth]],
    ['deleteTournament', [7, password], 'delete', ['/history/7', auth]],
    ['addPlayer', ['Alice', password], 'post', ['/players', { name: 'Alice' }, auth]],
    ['fetchPlayers', [], 'get', ['/players']],
    ['updatePlayer', [7, data, password], 'put', ['/players/7', data, auth]],
    ['fetchPlayerStatistics', [7], 'get', ['/players/7/statistics']],
    ['fetchPlayerInsights', [7], 'get', ['/players/7/insights']],
    ['fetchTrophyLeaderboard', [], 'get', ['/players/trophy-leaderboard']],
    ['fetchFundSettings', [], 'get', ['/fund/settings']],
    ['updateFundSettings', [data, password], 'post', ['/fund/settings', data, auth]],
    ['seedInitialData', [data, password], 'post', ['/fund/seed', data, auth]],
    ['fetchFundBalances', [], 'get', ['/fund/balances', { params: {} }]],
    ['calculateTournamentCosts', [data, password], 'post', ['/fund/tournament-costs/calculate', data, auth]],
    ['saveTournamentCosts', [data, password], 'post', ['/fund/tournament-costs/save', data, auth]],
    ['fetchPlayerAttendance', [], 'get', ['/fund/attendance']],
    ['fetchTournamentPlayersByDate', ['2026-10-24'], 'get', ['/history/players-by-date', { params: { date: '2026-10-24' } }]],
    ['recordPayment', [data, password], 'post', ['/fund/record-payment', data, auth]],
    ['fetchPaymentHistory', [], 'get', ['/fund/payments/history', { params: { page: 1, page_size: 20 } }]],
    ['updatePayment', [7, data, password], 'put', ['/fund/payments/7', data, auth]],
    ['deletePayment', [7, password], 'delete', ['/fund/payments/7', auth]],
    ['fetchDaysPlayedComparison', [], 'get', ['/fund/days-played-comparison']],
    ['fetchTournamentCostDates', [], 'get', ['/fund/tournament-costs/dates']],
    ['fetchTournamentCostDetails', ['2026-10-24'], 'get', ['/fund/tournament-costs/2026-10-24']],
    ['fetchTournamentCostInput', ['2026-10-24'], 'get', ['/fund/tournament-costs/2026-10-24/input']],
    ['addPlayerMiscCost', [data, password], 'post', ['/fund/player-misc-cost', data, auth]],
    ['createUnofficialTournament', [data, password], 'post', ['/history/create-unofficial', data, auth]],
    ['fetchPlayerTournamentCosts', [7], 'get', ['/fund/players/7/tournament-costs', { params: { page: 1, page_size: 10 } }]],
    ['fetchPlayerMiscCosts', [7], 'get', ['/fund/players/7/misc-costs', { params: { page: 1, page_size: 10 } }]],
    ['updateNextTournamentDate', ['2026-10-24', password], 'post', ['/fund/settings/next-tournament', null, { params: { next_date: '2026-10-24', password } }]],
    ['fetchRankingProxy', ['url'], 'get', ['/ranking/proxy', { params: { url: 'url', force_refresh: false } }]],
    ['fetchYouTubeSearch', ['Alice'], 'get', ['/ranking/youtube-search', { params: { q: 'Alice' } }]],
    ['fetchYouTubePlaylist', ['PL1'], 'get', ['/ranking/youtube-playlist', { params: { list_id: 'PL1' } }]],
    ['fetchClubTournaments', [], 'get', ['/club-tournaments', { params: { status_filter: 'all', page: 1, page_size: 20 } }]],
    ['createClubTournament', [data, password], 'post', ['/club-tournaments', data, auth]],
    ['updateClubTournament', [7, data, password], 'put', ['/club-tournaments/7', data, auth]],
    ['deleteClubTournament', [7, password], 'delete', ['/club-tournaments/7', auth]],
    ['submitClubTournamentResults', [7, data, password], 'post', ['/club-tournaments/7/results', data, auth]],
    ['updateClubTournamentResults', [7, data, password], 'put', ['/club-tournaments/7/results', data, auth]],
    ['fetchClubVenues', [], 'get', ['/club-venues']],
    ['createClubVenue', [data, password], 'post', ['/club-venues', data, auth]],
    ['updateClubVenue', [7, data, password], 'put', ['/club-venues/7', data, auth]],
    ['deleteClubVenue', [7, password], 'delete', ['/club-venues/7', auth]],
    ['bulkImportClubTournaments', [data, password], 'post', ['/club-tournaments/bulk-import', data, auth]],
];

beforeEach(() => {
    Object.values(client).forEach(method => method.mockResolvedValue({ data }));
});

test('uses the configured API base and JSON content type', () => {
    // clearMocks resets the call list; the created client remains the exported instance.
    expect(axios.create).toBeDefined();
    let configured;
    jest.isolateModules(() => {
        const moduleAxios = require('axios');
        require('./client');
        configured = moduleAxios.create.mock.calls.at(-1)[0];
    });
    expect(configured).toEqual({ baseURL: 'http://localhost:8000', headers: { 'Content-Type': 'application/json' } });
});

test.each(cases)('%s sends the correct request and unwraps response data', async (name, args, method, request) => {
    await expect(api[name](...args)).resolves.toBe(data);
    expect(client[method]).toHaveBeenCalledTimes(1);
    expect(client[method]).toHaveBeenCalledWith(...request);
});

test.each(cases)('%s propagates request failures', async (name, args, method) => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Offline');
    client[method].mockRejectedValue(error);
    await expect(api[name](...args)).rejects.toBe(error);
});

test('passes optional filters and custom pagination without losing values', async () => {
    await api.fetchFundBalances('alice', 'negative');
    expect(client.get).toHaveBeenLastCalledWith('/fund/balances', { params: { search: 'alice', filter: 'negative' } });
    await api.fetchPaymentHistory(2, 5, 'Alice');
    expect(client.get).toHaveBeenLastCalledWith('/fund/payments/history', { params: { page: 2, page_size: 5, player_name: 'Alice' } });
    await api.fetchClubTournaments({ statusFilter: 'past', venueId: 2, startDate: '2026-10-01', endDate: '2026-10-31', searchQuery: 'Singles', page: 3, pageSize: 5 });
    expect(client.get).toHaveBeenLastCalledWith('/club-tournaments', { params: { status_filter: 'past', venue_id: 2, start_date: '2026-10-01', end_date: '2026-10-31', search_query: 'Singles', page: 3, page_size: 5 } });
    await api.fetchRankingProxy('url', true);
    expect(client.get).toHaveBeenLastCalledWith('/ranking/proxy', { params: { url: 'url', force_refresh: true } });
});

test('player creation leaves encoding of password characters to Axios', async () => {
    await api.addPlayer('Alice', 'p&ss?=word');
    expect(client.post).toHaveBeenLastCalledWith('/players', { name: 'Alice' }, { params: { password: 'p&ss?=word' } });
});
