import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAllPlayers, calculateRankings } from '../logic/ranking';
import { generateGroups } from '../logic/grouping';
import { fetchHistory, addTournament, updateTournament, deleteTournament } from '../api/client';

// Async Thunks
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

const initialState = {
    history: [],
    allPlayers: [],
    selectedPlayers: [],
    rankedPlayers: [],
    groups: { groupA: [], groupB: [] },
    isGroupsGenerated: false,
    tournamentDate: new Date().toISOString().split('T')[0],
    customPlayers: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
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
            state.rankedPlayers = calculateRankings(state.history, state.selectedPlayers);
        },
        generateGroupsAction: (state) => {
            if (state.rankedPlayers.length === 0) {
                state.rankedPlayers = calculateRankings(state.history, state.selectedPlayers);
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
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchHistoryAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchHistoryAsync.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.history = action.payload;
                const players = getAllPlayers(action.payload);
                console.log("Extracted Players:", players);
                state.allPlayers = players;
            })
            .addCase(fetchHistoryAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(uploadRankingAsync.fulfilled, (state, action) => {
                const newTournament = action.payload;
                state.history = [newTournament, ...state.history];

                // Update players
                const newPlayers = new Set(state.allPlayers);
                newTournament.ranks.forEach(r => {
                    r.players.forEach(p => newPlayers.add(p));
                });
                state.allPlayers = Array.from(newPlayers).sort();
                state.rankedPlayers = [];
            })
            .addCase(updateRankingAsync.fulfilled, (state, action) => {
                const { id, tournamentData } = action.payload;
                const index = state.history.findIndex(t => t.id === id);
                if (index !== -1) {
                    state.history[index] = tournamentData;
                }

                // Re-calculate players just in case
                const newPlayers = new Set(state.allPlayers);
                tournamentData.ranks.forEach(r => {
                    r.players.forEach(p => newPlayers.add(p));
                });
                state.allPlayers = Array.from(newPlayers).sort();
                state.rankedPlayers = [];
            })
            .addCase(deleteRankingAsync.fulfilled, (state, action) => {
                const id = action.payload;
                state.history = state.history.filter(t => t.id !== id);
                // We could re-calculate allPlayers here, but it's complex to know if a player was ONLY in that tournament.
                // For now, we keep the player list as is, which is safe.
                state.rankedPlayers = [];
            });
    },
});

export const { togglePlayerSelection, calculateRanks, generateGroupsAction, resetGroups, setTournamentDate, addNewPlayer } = appSlice.actions;

export default appSlice.reducer;
