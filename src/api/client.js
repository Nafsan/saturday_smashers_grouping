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

export const addPlayer = async (playerName) => {
    const response = await client.post('/players', { name: playerName });
    return response.data;
};

export const fetchPlayers = async () => {
    const response = await client.get('/players');
    return response.data;
};

export default client;

