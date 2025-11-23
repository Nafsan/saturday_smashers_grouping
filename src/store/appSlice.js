import { createSlice } from '@reduxjs/toolkit';
import historyData from '../data/history.json';
import { getAllPlayers, calculateRankings } from '../logic/ranking';
import { generateGroups } from '../logic/grouping';

const initialState = {
    history: historyData,
    allPlayers: getAllPlayers(historyData),
    selectedPlayers: [], // Names of players selected for this week
    rankedPlayers: [], // Calculated ranks
    groups: { groupA: [], groupB: [] },
    isGroupsGenerated: false,
    tournamentDate: new Date().toISOString().split('T')[0],
    customPlayers: [], // Players added manually for this session
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
            // Invalidate ranks when selection changes
            state.rankedPlayers = [];
        },
        calculateRanks: (state) => {
            state.rankedPlayers = calculateRankings(state.history, state.selectedPlayers);
        },
        generateGroupsAction: (state) => {
            // Ensure ranks are calculated first
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
            state.rankedPlayers = []; // Clear ranks to force recalculation next time
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
                // Auto-select the new player
                state.selectedPlayers.push(name);
                state.rankedPlayers = []; // Invalidate ranks
            }
        },
        updateHistory: (state, action) => {
            const newTournament = action.payload;
            // Prepend new tournament (newest first)
            state.history = [newTournament, ...state.history];

            // Update allPlayers with any new players found in the ranking
            const newPlayers = new Set(state.allPlayers);
            newTournament.ranks.forEach(r => {
                r.players.forEach(p => newPlayers.add(p));
            });
            state.allPlayers = Array.from(newPlayers).sort();

            // Invalidate ranks
            state.rankedPlayers = [];
        }
    },
});

export const { togglePlayerSelection, calculateRanks, generateGroupsAction, resetGroups, setTournamentDate, addNewPlayer, updateHistory } = appSlice.actions;

export default appSlice.reducer;
