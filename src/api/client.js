import axios from 'axios';

// Default to localhost for dev, can be configured via env var
const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchHistory = async () => {
    try {
        const response = await client.get('/history');
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const addTournament = async (tournamentData) => {
    const response = await client.post('/history', tournamentData, {

    });
    return response.data;
};

export const updateTournament = async (id, tournamentData) => {
    const response = await client.put(`/history/${id}`, tournamentData, {

    });
    return response.data;
};

export const updateUnofficialTournamentDetails = async (id, details) => {
    const response = await client.patch(`/history/${id}/unofficial-details`, details, {

    });
    return response.data;
};

export const deleteTournament = async (id) => {
    const response = await client.delete(`/history/${id}`, {

    });
    return response.data;
};

export const addPlayer = async (playerName) => {
    const response = await client.post('/players', { name: playerName }, {

    });
    return response.data;
};

export const fetchPlayers = async () => {
    const response = await client.get('/players');
    return response.data;
};

export const updatePlayer = async (playerId, data) => {
    const response = await client.put(`/players/${playerId}`, data, {

    });
    return response.data;
};

export const fetchPlayerStatistics = async (playerId) => {
    const response = await client.get(`/players/${playerId}/statistics`);
    return response.data;
};

export const fetchPlayerInsights = async (playerId) => {
    const response = await client.get(`/players/${playerId}/insights`);
    return response.data;
};

export const fetchTrophyLeaderboard = async () => {
    const response = await client.get('/players/trophy-leaderboard');
    return response.data;
};


// ============ Fund Management APIs ============
export const fetchFundSettings = async () => {
    const response = await client.get('/fund/settings');
    return response.data;
};

export const updateFundSettings = async (settings) => {
    const response = await client.post('/fund/settings', settings, {

    });
    return response.data;
};

export const seedInitialData = async (data) => {
    const response = await client.post('/fund/seed', data, {

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

export const calculateTournamentCosts = async (data) => {
    const response = await client.post('/fund/tournament-costs/calculate', data, {

    });
    return response.data;
};

export const saveTournamentCosts = async (data) => {
    const response = await client.post('/fund/tournament-costs/save', data, {

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

export const recordPayment = async (data) => {
    const response = await client.post('/fund/record-payment', data, {

    });
    return response.data;
};

export const fetchPaymentHistory = async (page = 1, pageSize = 20, playerName = null) => {
    const params = { page, page_size: pageSize };
    if (playerName) params.player_name = playerName;

    const response = await client.get('/fund/payments/history', { params });
    return response.data;
};

export const updatePayment = async (id, data) => {
    const response = await client.put(`/fund/payments/${id}`, data, {

    });
    return response.data;
};

export const deletePayment = async (id) => {
    const response = await client.delete(`/fund/payments/${id}`, {

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

export const fetchTournamentCostInput = async (date) => {
    const response = await client.get(`/fund/tournament-costs/${date}/input`);
    return response.data;
};

export const addPlayerMiscCost = async (data) => {
    const response = await client.post('/fund/player-misc-cost', data, {

    });
    return response.data;
};

export const createUnofficialTournament = async (data) => {
    const response = await client.post('/history/create-unofficial', data, {

    });
    return response.data;
};

export const fetchPlayerTournamentCosts = async (playerId, page = 1, pageSize = 10) => {
    const response = await client.get(`/fund/players/${playerId}/tournament-costs`, {
        params: { page, page_size: pageSize }
    });
    return response.data;
};

export const fetchPlayerMiscCosts = async (playerId, page = 1, pageSize = 10) => {
    const response = await client.get(`/fund/players/${playerId}/misc-costs`, {
        params: { page, page_size: pageSize }
    });
    return response.data;
};

export const updateNextTournamentDate = async (date) => {
    const response = await client.post('/fund/settings/next-tournament', null, {
        params: { next_date: date }
    });
    return response.data;
};

export const fetchRankingProxy = async (url, forceRefresh = false) => {
    const response = await client.get('/ranking/proxy', {
        params: { url, force_refresh: forceRefresh }
    });
    return response.data;
};

export const fetchYouTubeSearch = async (query) => {
    const response = await client.get('/ranking/youtube-search', {
        params: { q: query }
    });
    return response.data;
};

export const fetchYouTubePlaylist = async (playlistId) => {
    const response = await client.get('/ranking/youtube-playlist', {
        params: { list_id: playlistId }
    });
    return response.data;
};


// ============ Club Tournament APIs ============
export const fetchClubTournaments = async (params = {}) => {
    const { 
        statusFilter = 'all', 
        venueId = null, 
        startDate = null, 
        endDate = null,
        searchQuery = null,
        page = 1, 
        pageSize = 20 
    } = params;
    
    const queryParams = { 
        status_filter: statusFilter,
        page,
        page_size: pageSize
    };
    if (venueId) queryParams.venue_id = venueId;
    if (startDate) queryParams.start_date = startDate;
    if (endDate) queryParams.end_date = endDate;
    if (searchQuery) queryParams.search_query = searchQuery;
    
    const response = await client.get('/club-tournaments', { params: queryParams });
    return response.data;
};

export const createClubTournament = async (data) => {
    const response = await client.post('/club-tournaments', data, {

    });
    return response.data;
};

export const updateClubTournament = async (id, data) => {
    const response = await client.put(`/club-tournaments/${id}`, data, {

    });
    return response.data;
};

export const deleteClubTournament = async (id) => {
    const response = await client.delete(`/club-tournaments/${id}`, {

    });
    return response.data;
};

export const submitClubTournamentResults = async (tournamentId, data) => {
    const response = await client.post(`/club-tournaments/${tournamentId}/results`, data, {

    });
    return response.data;
};

export const updateClubTournamentResults = async (tournamentId, data) => {
    const response = await client.put(`/club-tournaments/${tournamentId}/results`, data, {

    });
    return response.data;
};

export const fetchClubVenues = async () => {
    const response = await client.get('/club-venues');
    return response.data;
};

export const createClubVenue = async (data) => {
    const response = await client.post('/club-venues', data, {

    });
    return response.data;
};

export const updateClubVenue = async (id, data) => {
    const response = await client.put(`/club-venues/${id}`, data, {

    });
    return response.data;
};

export const deleteClubVenue = async (id) => {
    const response = await client.delete(`/club-venues/${id}`, {

    });
    return response.data;
};

export const bulkImportClubTournaments = async (data) => {
    const response = await client.post('/club-tournaments/bulk-import', data, {

    });
    return response.data;
};

export default client;
