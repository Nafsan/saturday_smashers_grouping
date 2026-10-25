import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';

// Use the app's existing Vite loader for its browser module imports.
const server = await createServer({ configFile: false, server: { middlewareMode: true } });
let playerModule;
try {
    playerModule = await server.ssrLoadModule('/src/store/appSlice.js');
} finally {
    await server.close();
}
const { default: reducer, fetchPlayersAsync, updatePlayerAsync } = playerModule;

test('player fetching works independently from the home page loading state', () => {
    const initial = reducer(undefined, { type: 'init' });
    const pending = reducer(initial, fetchPlayersAsync.pending('request'));
    assert.equal(pending.playersStatus, 'loading');
    assert.equal(pending.status, 'idle');
    const loaded = reducer(pending, fetchPlayersAsync.fulfilled([{ id: 1, name: 'Alice', is_guest: false }], 'request'));
    assert.equal(loaded.playersStatus, 'succeeded');
    assert.equal(loaded.status, 'idle'); // Home can still load history when opened later.
    assert.equal(loaded.allPlayers[0].name, 'Alice');
});

test('failed player fetch retains cached players and allows retry without blocking home', () => {
    const initial = { ...reducer(undefined, { type: 'init' }), status: 'succeeded', allPlayers: [{ id: 1, name: 'Alice' }] };
    const failed = reducer(initial, fetchPlayersAsync.rejected(new Error('Offline'), 'request'));
    assert.equal(failed.playersStatus, 'failed');
    assert.equal(failed.playersError, 'Offline');
    assert.equal(failed.status, 'succeeded');
    assert.deepEqual(failed.allPlayers, initial.allPlayers);
    const retry = reducer(failed, fetchPlayersAsync.pending('retry'));
    assert.equal(retry.playersStatus, 'loading');
    assert.equal(retry.playersError, null);
});

test('renaming updates cached history, fixtures and charts while preserving stats', () => {
    const initial = {
        ...reducer(undefined, { type: 'init' }),
        allPlayers: [{ id: 1, name: 'Alice', is_guest: false }, { id: 2, name: 'Bob', is_guest: true }],
        history: [{ id: 'official', description: 'Alice won', ranks: [{ rating: 1, players: ['Alice', 'Bob'] }] }],
        selectedPlayers: ['Alice', 'Bob'], customPlayers: ['Alice'],
        temporaryPlayers: [{ name: 'Alice', initialRank: 2 }],
        rankedPlayers: [{ name: 'Alice', average: 1.5, playedCount: 2 }],
        groups: { groupA: [{ name: 'Alice', average: 1.5 }], groupB: [{ name: 'Bob', average: 3 }] },
        daysPlayedData: [{ player_name: 'Alice', days_played: 5 }],
        trophyLeaderboard: [{ name: 'Alice', trophy_count: 2 }],
    };
    const renamed = reducer(initial, updatePlayerAsync.fulfilled({ id: 1, name: 'Zara', is_guest: false }, 'request', { playerId: 1, name: 'Zara' }));
    assert.deepEqual(renamed.allPlayers.map(player => player.name), ['Bob', 'Zara']);
    assert.deepEqual(renamed.history[0].ranks[0].players, ['Zara', 'Bob']);
    assert.equal(renamed.history[0].description, 'Alice won');
    assert.deepEqual(renamed.selectedPlayers, ['Zara', 'Bob']);
    assert.deepEqual(renamed.customPlayers, ['Zara']);
    assert.deepEqual(renamed.temporaryPlayers, [{ name: 'Zara', initialRank: 2 }]);
    assert.deepEqual(renamed.rankedPlayers, [{ name: 'Zara', average: 1.5, playedCount: 2 }]);
    assert.equal(renamed.groups.groupA[0].name, 'Zara');
    assert.equal(renamed.groups.groupB[0].name, 'Bob');
    assert.deepEqual(renamed.daysPlayedData, [{ player_name: 'Zara', days_played: 5 }]);
    assert.deepEqual(renamed.trophyLeaderboard, [{ name: 'Zara', trophy_count: 2 }]);
    assert.equal(initial.allPlayers[0].name, 'Alice');
});

test('guest status changes preserve player names and tournament history', () => {
    const initial = {
        ...reducer(undefined, { type: 'init' }),
        allPlayers: [{ id: 1, name: 'Alice', is_guest: false }],
        history: [{ ranks: [{ players: ['Alice'] }] }],
    };
    const updated = reducer(initial, updatePlayerAsync.fulfilled({ id: 1, name: 'Alice', is_guest: true }, 'request', { playerId: 1, isGuest: true }));
    assert.equal(updated.allPlayers[0].is_guest, true);
    assert.deepEqual(updated.history, initial.history);
});
