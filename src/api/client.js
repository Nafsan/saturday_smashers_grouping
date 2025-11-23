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

export default client;
