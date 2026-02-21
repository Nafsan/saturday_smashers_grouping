import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAllPlayers, calculateRankings } from '../logic/ranking';
import { generateGroups } from '../logic/grouping';
import { fetchHistory, addTournament, updateTournament, deleteTournament, fetchPlayers } from '../api/client';
import { getThemeCookie, setThemeCookie } from '../utils/cookieUtils';

// Async Thunks
export const fetchPlayersAsync = createAsyncThunk(
    'app/fetchPlayers',
    async () => {
        const players = await fetchPlayers();
        return players; // Return full player objects with id and name
    }
);

export const fetchHistoryAsync = createAsyncThunk(
    'app/fetchHistory',
    async () => {
        const data = await fetchHistory();
        return data;
    }
);

export const uploadRankingAsync = createAsyncThunk(
    'app/uploadRanking',
    async ({ tournamentData, password }, { dispatch }) => {
        await addTournament(tournamentData, password);
        return tournamentData; // Return data to update state optimistically or just trigger refetch
    }
);

export const updateRankingAsync = createAsyncThunk(
    'app/updateRanking',
    async ({ id, tournamentData, password }, { dispatch }) => {
        await updateTournament(id, tournamentData, password);
        return { id, tournamentData };
    }
);

export const deleteRankingAsync = createAsyncThunk(
    'app/deleteRanking',
    async ({ id, password }, { dispatch }) => {
        await deleteTournament(id, password);
        return id;
    }
);

export const addPlayerAsync = createAsyncThunk(
    'app/addPlayer',
    async ({ playerName, password }) => {
        const { addPlayer } = await import('../api/client');
        const player = await addPlayer(playerName, password);
        return player.name;
    }
);


const initialState = {
    history: [],
    allPlayers: [],
    selectedPlayers: [],
    rankedPlayers: [],
    groups: { groupA: [], groupB: [] },
    isGroupsGenerated: false,
    tournamentDate: new Date().toISOString().split('T')[0],
    customPlayers: [],
    temporaryPlayers: [], // { name, initialRank }
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    theme: typeof window !== 'undefined' ? (getThemeCookie() || 'dark') : 'dark'
};

export const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        togglePlayerSelection: (state, action) => {
            const playerName = action.payload;
            if (state.selectedPlayers.includes(playerName)) {
                state.selectedPlayers = state.selectedPlayers.filter(p => p !== playerName);
            } else {
                state.selectedPlayers.push(playerName);
            }
            state.rankedPlayers = [];
        },
        calculateRanks: (state) => {
            state.rankedPlayers = calculateRankings(state.history, state.selectedPlayers, state.temporaryPlayers);
        },
        generateGroupsAction: (state) => {
            if (state.rankedPlayers.length === 0) {
                state.rankedPlayers = calculateRankings(state.history, state.selectedPlayers, state.temporaryPlayers);
            }
            const { groupA, groupB } = generateGroups(state.rankedPlayers);
            state.groups = { groupA, groupB };
            state.isGroupsGenerated = true;
        },
        resetGroups: (state) => {
            state.isGroupsGenerated = false;
            state.groups = { groupA: [], groupB: [] };
            state.rankedPlayers = [];
        },
        setTournamentDate: (state, action) => {
            state.tournamentDate = action.payload;
        },
        addNewPlayer: (state, action) => {
            const name = action.payload;
            if (!state.allPlayers.includes(name)) {
                state.allPlayers.push(name);
                state.allPlayers.sort();
                state.customPlayers.push(name);
                state.selectedPlayers.push(name);
                state.rankedPlayers = [];
            }
        },
        addTemporaryPlayer: (state, action) => {
            const { name, initialRank } = action.payload;

            // Add to allPlayers if not exists (legacy support for truly temporary players)
            if (!state.allPlayers.includes(name)) {
                state.allPlayers.push(name);
                state.allPlayers.sort();
            }

            // Always add/update temporary player record
            // Remove existing if any to avoid duplicates
            state.temporaryPlayers = state.temporaryPlayers.filter(tp => tp.name !== name);
            state.temporaryPlayers.push({ name, initialRank });

            // Ensure selected
            if (!state.selectedPlayers.includes(name)) {
                state.selectedPlayers.push(name);
            }

            state.rankedPlayers = [];
        },
        clearDraftState: (state) => {
            // Clear temporary players and selections
            // We do NOT remove from allPlayers anymore because all players are now real DB players
            state.temporaryPlayers = [];
            state.selectedPlayers = [];
            state.rankedPlayers = [];
        },
        toggleTheme: (state) => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            if (typeof window !== 'undefined') {
                setThemeCookie(state.theme);
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPlayersAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchPlayersAsync.fulfilled, (state, action) => {
                state.allPlayers = action.payload;
            })
            .addCase(fetchPlayersAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(fetchHistoryAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchHistoryAsync.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.history = action.payload;
            })
            .addCase(fetchHistoryAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(uploadRankingAsync.fulfilled, (state, action) => {
                const newTournament = action.payload;
                state.history = [newTournament, ...state.history];
                state.rankedPlayers = [];
            })
            .addCase(updateRankingAsync.fulfilled, (state, action) => {
                const { id, tournamentData } = action.payload;
                const index = state.history.findIndex(t => t.id === id);
                if (index !== -1) {
                    state.history[index] = tournamentData;
                }
                state.rankedPlayers = [];
            })
            .addCase(deleteRankingAsync.fulfilled, (state, action) => {
                const id = action.payload;
                state.history = state.history.filter(t => t.id !== id);
                state.rankedPlayers = [];
            })
            .addCase(addPlayerAsync.fulfilled, (state, action) => {
                const playerName = action.payload;
                if (!state.allPlayers.includes(playerName)) {
                    state.allPlayers.push(playerName);
                    state.allPlayers.sort();
                }
            });
    },
});

export const { togglePlayerSelection, calculateRanks, generateGroupsAction, resetGroups, setTournamentDate, addNewPlayer, addTemporaryPlayer, clearDraftState, toggleTheme } = appSlice.actions;

// Selectors
export const selectAllPlayerNames = (state) => {
    const players = state.app.allPlayers;
    if (players.length === 0) return [];
    // Handle both formats: array of strings or array of objects
    return typeof players[0] === 'string' ? players : players.map(p => p.name);
};

export const selectAllPlayers = (state) => state.app.allPlayers;

export default appSlice.reducer;

