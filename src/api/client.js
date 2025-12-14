import axios from 'axios';

// Default to localhost for dev, can be configured via env var
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchHistory = async () => {
    try {
        console.log("Fetching history from API...");
        const response = await client.get('/history');
        console.log("API Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const addTournament = async (tournamentData, password) => {
    const response = await client.post('/history', tournamentData, {
        params: { password } // Sending password as query param for simplicity as per main.py
    });
    return response.data;
};

export const updateTournament = async (id, tournamentData, password) => {
    const response = await client.put(`/history/${id}`, tournamentData, {
        params: { password }
    });
    return response.data;
};

export const deleteTournament = async (id, password) => {
    const response = await client.delete(`/history/${id}`, {
        params: { password }
    });
    return response.data;
};

export const addPlayer = async (playerName, password) => {
    const response = await client.post(`/players?password=${password}`, { name: playerName });
    return response.data;
};

export const fetchPlayers = async () => {
    const response = await client.get('/players');
    return response.data;
};

export const fetchPlayerStatistics = async (playerId) => {
    const response = await client.get(`/players/${playerId}/statistics`);
    return response.data;
};


// ============ Fund Management APIs ============
export const fetchFundSettings = async () => {
    const response = await client.get('/fund/settings');
    return response.data;
};

export const updateFundSettings = async (settings, password) => {
    const response = await client.post('/fund/settings', settings, {
        params: { password }
    });
    return response.data;
};

export const seedInitialData = async (data, password) => {
    const response = await client.post('/fund/seed', data, {
        params: { password }
    });
    return response.data;
};

export const fetchFundBalances = async (search = null, filter = null) => {
    const params = {};
    if (search) params.search = search;
    if (filter) params.filter = filter;

    const response = await client.get('/fund/balances', { params });
    return response.data;
};

export const calculateTournamentCosts = async (data, password) => {
    const response = await client.post('/fund/tournament-costs/calculate', data, {
        params: { password }
    });
    return response.data;
};

export const saveTournamentCosts = async (data, password) => {
    const response = await client.post('/fund/tournament-costs/save', data, {
        params: { password }
    });
    return response.data;
};

export const fetchPlayerAttendance = async () => {
    const response = await client.get('/fund/attendance');
    return response.data;
};

export const fetchTournamentPlayersByDate = async (date) => {
    const response = await client.get('/history/players-by-date', {
        params: { date }
    });
    return response.data;
};

export const recordPayment = async (data, password) => {
    const response = await client.post('/fund/record-payment', data, {
        params: { password }
    });
    return response.data;
};

export const fetchDaysPlayedComparison = async () => {
    const response = await client.get('/fund/days-played-comparison');
    return response.data;
};

export const fetchTournamentCostDates = async () => {
    const response = await client.get('/fund/tournament-costs/dates');
    return response.data;
};

export const fetchTournamentCostDetails = async (date) => {
    const response = await client.get(`/fund/tournament-costs/${date}`);
    return response.data;
};

export default client;

