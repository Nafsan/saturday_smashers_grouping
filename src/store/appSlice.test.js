import { configureStore } from '@reduxjs/toolkit';
import reducer, * as app from './appSlice';
import * as api from '../api/client';

jest.mock('../api/client');

const makeStore = overrides => configureStore({ reducer: { app: reducer }, preloadedState: {
    app: { ...reducer(undefined, { type: 'init' }), ...overrides },
} });
const history = [{ id: 'cup', date: '2026-10-24', ranks: [{ rating: 1, players: ['Alice'] }, { rating: 3, players: ['Bob'] }] }];

test('selection toggles invalidate rankings and draft reset keeps persisted players', () => {
    const store = makeStore({ allPlayers: ['Alice'], rankedPlayers: [{ name: 'Alice' }] });
    store.dispatch(app.togglePlayerSelection('Alice'));
    expect(store.getState().app.selectedPlayers).toEqual(['Alice']);
    expect(store.getState().app.rankedPlayers).toEqual([]);
    store.dispatch(app.togglePlayerSelection('Alice'));
    expect(store.getState().app.selectedPlayers).toEqual([]);
    store.dispatch(app.addTemporaryPlayer({ name: 'Alice', initialRank: 2 }));
    store.dispatch(app.addTemporaryPlayer({ name: 'Alice', initialRank: 3 }));
    expect(store.getState().app.temporaryPlayers).toEqual([{ name: 'Alice', initialRank: 3 }]);
    expect(store.getState().app.selectedPlayers).toEqual(['Alice']);
    store.dispatch(app.clearDraftState());
    expect(store.getState().app).toMatchObject({ allPlayers: ['Alice'], temporaryPlayers: [], selectedPlayers: [], rankedPlayers: [] });
});

test('temporary and custom players are deduplicated and selected', () => {
    const store = makeStore();
    store.dispatch(app.addNewPlayer('Bob'));
    store.dispatch(app.addNewPlayer('Bob'));
    store.dispatch(app.addTemporaryPlayer({ name: 'Alice', initialRank: 1 }));
    expect(store.getState().app.allPlayers).toEqual(['Alice', 'Bob']);
    expect(store.getState().app.customPlayers).toEqual(['Bob']);
    expect(store.getState().app.selectedPlayers).toEqual(['Bob', 'Alice']);
});

test('calculates ranks, generates chosen group count/method, and resets results', () => {
    const store = makeStore({ history, selectedPlayers: ['Alice', 'Bob'] });
    store.dispatch(app.setTournamentDate('2026-10-31'));
    store.dispatch(app.generateGroupsAction());
    expect(store.getState().app).toMatchObject({ tournamentDate: '2026-10-31', isGroupsGenerated: true });
    expect(store.getState().app.groups.groupA[0].name).toBe('Alice');
    store.dispatch(app.calculateRanks());
    store.dispatch(app.setGroupGenerationMethod('random'));
    store.dispatch(app.generateGroupsAction(3));
    expect(Object.keys(store.getState().app.groups)).toHaveLength(3);
    store.dispatch(app.resetGroups());
    expect(store.getState().app).toMatchObject({ isGroupsGenerated: false, rankedPlayers: [], groups: { groupA: [], groupB: [] } });
});

test('theme toggling persists both transitions in cookies', () => {
    const store = makeStore({ theme: 'dark' });
    store.dispatch(app.toggleTheme());
    expect(store.getState().app.theme).toBe('light');
    expect(document.cookie).toContain('ss_theme=light');
    store.dispatch(app.toggleTheme());
    expect(store.getState().app.theme).toBe('dark');
});

const reads = [
    [app.fetchPlayersAsync, 'fetchPlayers', [{ id: 1, name: 'Alice' }], 'allPlayers', 'playersStatus'],
    [app.fetchHistoryAsync, 'fetchHistory', history, 'history', 'status'],
    [app.fetchFundSettingsAsync, 'fetchFundSettings', { default_venue_fee: 100 }, 'fundSettings', 'fundStatus'],
    [app.fetchDaysPlayedComparisonAsync, 'fetchDaysPlayedComparison', [{ player_name: 'Alice', days_played: 1 }], 'daysPlayedData', 'analyticsStatus'],
    [app.fetchTrophyLeaderboardAsync, 'fetchTrophyLeaderboard', [{ name: 'Alice', trophy_count: 1 }], 'trophyLeaderboard', null],
];
test.each(reads)('%s reads through the API and updates the appropriate state', async (thunk, method, data, field, status) => {
    api[method].mockResolvedValue(data);
    const store = makeStore();
    const pending = store.dispatch(thunk());
    if (status) expect(store.getState().app[status]).toBe('loading');
    await pending.unwrap();
    expect(store.getState().app[field]).toEqual(data);
    if (status) expect(store.getState().app[status]).toBe('succeeded');
});

test.each([[app.fetchPlayersAsync, 'fetchPlayers', 'playersError'], [app.fetchHistoryAsync, 'fetchHistory', 'error']])(
    '%s exposes a readable failure without losing cached data', async (thunk, method, errorField) => {
        api[method].mockRejectedValue(new Error('Offline'));
        const store = makeStore({ history, allPlayers: [{ id: 1, name: 'Alice' }] });
        await store.dispatch(thunk());
        expect(store.getState().app[errorField]).toBe('Offline');
        expect(store.getState().app.history).toEqual(history);
        expect(store.getState().app.allPlayers).toEqual([{ id: 1, name: 'Alice' }]);
    },
);

test('create/update/delete tournament thunks update cached history and invalidate ranks', async () => {
    const store = makeStore({ history, rankedPlayers: [{ name: 'Alice' }] });
    const added = { id: 'next', date: '2026-10-31', ranks: [] };
    await store.dispatch(app.uploadRankingAsync({ tournamentData: added, password: 'pw' })).unwrap();
    expect(api.addTournament).toHaveBeenCalledWith(added, 'pw');
    expect(store.getState().app.history.map(t => t.id)).toEqual(['next', 'cup']);
    const updated = { ...added, date: '2026-11-01' };
    await store.dispatch(app.updateRankingAsync({ id: 'next', tournamentData: updated, password: 'pw' })).unwrap();
    expect(store.getState().app.history[0].date).toBe('2026-11-01');
    await store.dispatch(app.updateRankingAsync({ id: 'missing', tournamentData: updated, password: 'pw' })).unwrap();
    expect(store.getState().app.history).toHaveLength(2);
    await store.dispatch(app.deleteRankingAsync({ id: 'next', password: 'pw' })).unwrap();
    expect(api.deleteTournament).toHaveBeenCalledWith('next', 'pw');
    expect(store.getState().app.history).toEqual(history);
    expect(store.getState().app.rankedPlayers).toEqual([]);
});

test('unofficial detail updates preserve official flags and ranking records', async () => {
    const store = makeStore({ history });
    api.updateUnofficialTournamentDetails.mockResolvedValue({ playlist_url: 'playlist', description: 'Notes' });
    await store.dispatch(app.updateUnofficialTournamentAsync({ id: 'cup', details: {}, password: 'pw' })).unwrap();
    expect(store.getState().app.history[0]).toMatchObject({ description: 'Notes', ranks: history[0].ranks });
    await store.dispatch(app.updateUnofficialTournamentAsync({ id: 'missing', details: {}, password: 'pw' })).unwrap();
    expect(store.getState().app.history).toHaveLength(1);
});

test('add-player thunk deduplicates IDs and sorts the roster', async () => {
    api.addPlayer.mockResolvedValue({ id: 1, name: 'Alice' });
    const store = makeStore({ allPlayers: [{ id: 2, name: 'Bob' }] });
    await store.dispatch(app.addPlayerAsync({ playerName: 'Alice', password: 'pw' })).unwrap();
    await store.dispatch(app.addPlayerAsync({ playerName: 'Alice', password: 'pw' })).unwrap();
    expect(store.getState().app.allPlayers.map(p => p.name)).toEqual(['Alice', 'Bob']);
});

test.each([{ name: 'Zara' }, { isGuest: true }, { name: 'Zara', isGuest: false }])('update-player sends only provided fields %j', async changes => {
    const saved = { id: 1, name: changes.name || 'Alice', is_guest: changes.isGuest ?? false };
    api.updatePlayer.mockResolvedValue(saved);
    const store = makeStore({ allPlayers: [{ id: 1, name: 'Alice' }] });
    await store.dispatch(app.updatePlayerAsync({ playerId: 1, password: 'pw', ...changes })).unwrap();
    const payload = {};
    if ('name' in changes) payload.name = changes.name;
    if ('isGuest' in changes) payload.is_guest = changes.isGuest;
    expect(api.updatePlayer).toHaveBeenCalledWith(1, payload, 'pw');
    expect(store.getState().app.allPlayers[0]).toEqual(saved);
});

test.each([
    [{ response: { data: { detail: 'Duplicate player' } }, message: 'HTTP conflict' }, 'Duplicate player'],
    [{ response: { data: { detail: [] } }, message: 'Offline' }, 'Offline'],
])('update-player surfaces API error details', async (error, message) => {
    api.updatePlayer.mockRejectedValue(error);
    await expect(makeStore().dispatch(app.updatePlayerAsync({ playerId: 1, password: 'pw' })).unwrap()).rejects.toMatchObject({ message });
});

test('an update for an absent cached player does not corrupt another record', () => {
    const store = makeStore({ allPlayers: [{ id: 1, name: 'Alice' }] });
    store.dispatch(app.updatePlayerAsync.fulfilled({ id: 99, name: 'Unknown' }, 'request'));
    expect(store.getState().app.allPlayers).toEqual([{ id: 1, name: 'Alice' }]);
});

test('selectors handle legacy names, guests, empty and missing rosters', () => {
    const state = { app: { allPlayers: ['Zara', { id: 1, name: 'Alice', is_guest: false }, { id: 2, name: 'Bob', is_guest: true }, 42] } };
    expect(app.selectAllPlayerNames(state)).toEqual(['42', 'Alice', 'Bob', 'Zara']);
    expect(app.selectGuestPlayers(state)).toEqual([{ id: 2, name: 'Bob', is_guest: true }]);
    expect(app.selectRegularPlayers(state)).toContain('Zara');
    expect(app.selectAllPlayers(state)).toBe(state.app.allPlayers);
    for (const allPlayers of [undefined, []]) {
        for (const selector of [app.selectAllPlayerNames, app.selectRegularPlayers, app.selectGuestPlayers]) {
            expect(selector({ app: { allPlayers } })).toEqual([]);
        }
    }
});
